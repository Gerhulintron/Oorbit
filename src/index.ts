import { initializeKeypair } from "./initializeKeypair"
import * as web3 from "@solana/web3.js"
// Add the spl-token import at the top
import * as token from "@solana/spl-token"
import {
    Metaplex,
    keypairIdentity,
    bundlrStorage,
    toMetaplexFile,
} from "@metaplex-foundation/js"
import {
    DataV2,
    createCreateMetadataAccountV2Instruction,
    createUpdateMetadataAccountV2Instruction,
} from "@metaplex-foundation/mpl-token-metadata"
import * as fs from "fs"

//Create New Minting Account
async function createNewMint(
    connection: web3.Connection,
    payer: web3.Keypair,
    mintAuthority: web3.PublicKey,
    freezeAuthority: web3.PublicKey,
    decimals: number
): Promise<web3.PublicKey> {

    const tokenMint = await token.createMint(
        connection,
        payer,
        mintAuthority,
        freezeAuthority,
        decimals
    );

    console.log(`The token mint account address is ${tokenMint}`);
    console.log(
        `Token Mint: https://explorer.solana.com/address/${tokenMint}?cluster=devnet`
    );

    return tokenMint;
}

//Create TokenAccount
async function createTokenAccount(
    connection: web3.Connection,
    payer: web3.Keypair,
    mint: web3.PublicKey,
    owner: web3.PublicKey
    ) {
    const tokenAccount = await token.getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        owner
    );

    console.log(
        `Token Account: https://explorer.solana.com/address/${tokenAccount.address}?cluster=devnet`
    );

    return tokenAccount
}

//Minting Tokens
async function mintTokens(
    connection: web3.Connection,
    payer: web3.Keypair,
    mint: web3.PublicKey,
    destination: web3.PublicKey,
    authority: web3.Keypair,
    amount: number
) {
    const mintInfo = await token.getMint(connection, mint);

    const transactionSignature = await token.mintTo(
        connection,
        payer,
        mint,
        destination,
        authority,
        amount * 10 ** mintInfo.decimals
    );

    console.log(
        `Mint Token Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    )
}

//Transfer tokens
async function transferTokens(
    connection: web3.Connection,
    payer: web3.Keypair,
    source: web3.PublicKey,
    destination: web3.PublicKey,
    owner: web3.PublicKey,
    amount: number,
    mint: web3.PublicKey
) {
    const mintInfo = await token.getMint(connection, mint);

    const transactionSignature = await token.transfer(
        connection,
        payer,
        source,
        destination,
        owner,
        amount * 10 ** mintInfo.decimals
    );

    console.log(
        `Transfer Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    )
}

//Burning tokens
async function burnTokens(
    connection: web3.Connection,
    payer: web3.Keypair,
    account: web3.PublicKey,
    mint: web3.PublicKey,
    owner: web3.Keypair,
    amount: number
) {

    const mintInfo = await token.getMint(connection, mint);

    const transactionSignature = await token.burn(
        connection,
        payer,
        account,
        mint,
        owner,
        amount * 10 ** mintInfo.decimals
    );

    console.log(
        `Burn Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    )
}
//----------------------------------------------------------------------------------------------
async function createTokenMetadata(
    connection: web3.Connection,
    metaplex: Metaplex,
    mint: web3.PublicKey,
    user: web3.Keypair,
    name: string,
    symbol: string,
    description: string
) {
    // file to buffer
    const buffer = fs.readFileSync("assets/starwars.jpg");

    // buffer to metaplex file
    const file = toMetaplexFile(buffer, "starwars.jpg");

    // upload image and get image uri
    const imageUri = await metaplex.storage().upload(file);
    console.log("image uri:", imageUri);

    // upload metadata and get metadata uri (off chain metadata)
    const { uri } = await metaplex
        .nfts()
        .uploadMetadata({
            name: name,
            description: description,
            image: imageUri,
        });

    console.log("metadata uri:", uri);

    // get metadata account address
    const metadataPDA = metaplex.nfts().pdas().metadata({mint});

    // onchain metadata format
    const tokenMetadata = {
        name: name,
        symbol: symbol,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    } as DataV2;

    // transaction to create metadata account
    const transaction = new web3.Transaction().add(
        createCreateMetadataAccountV2Instruction(
            {
                metadata: metadataPDA,
                mint: mint,
                mintAuthority: user.publicKey,
                payer: user.publicKey,
                updateAuthority: user.publicKey,
            },
            {
                createMetadataAccountArgsV2: {
                    data: tokenMetadata,
                    isMutable: true,
                },
            }
        )
    );

    // send transaction
    const transactionSignature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [user]
    );

    console.log(
        `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    )


}
//-----------------------------------------------------------------------------------------------------
async function updateTokenMetadata(
    connection: web3.Connection,
    metaplex: Metaplex,
    mint: web3.PublicKey,
    user: web3.Keypair,
    name: string,
    symbol: string,
    description: string
) {
    // file to buffer
    const buffer = fs.readFileSync("assets/starwars.jpg");

    // buffer to metaplex file
    const file = toMetaplexFile(buffer, "starwars.jpg");

    // upload image and get image uri
    const imageUri = await metaplex.storage().upload(file);
    console.log("image uri:", imageUri);

    // upload metadata and get metadata uri (off chain metadata)
    const { uri } = await metaplex
        .nfts()
        .uploadMetadata({
            name: name,
            description: description,
            image: imageUri,
        });

    console.log("metadata uri:", uri);

    // get metadata account address
    const metadataPDA = metaplex.nfts().pdas().metadata({mint});

    // onchain metadata format
    const tokenMetadata = {
        name: name,
        symbol: symbol,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    } as DataV2

    // transaction to create metadata account
    const transaction = new web3.Transaction().add(
        createUpdateMetadataAccountV2Instruction(
            {
                metadata: metadataPDA,
                updateAuthority: user.publicKey,
            },
            {
                updateMetadataAccountArgsV2: {
                    data: tokenMetadata,
                    updateAuthority: user.publicKey,
                    primarySaleHappened: true,
                    isMutable: true,
                }
            }
        )
    );

    // send transaction
    const transactionSignature2 = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [user]
    );

    console.log(
        `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature2}?cluster=devnet`
    )

    const transaction2 = new web3.Transaction().add(
        createUpdateMetadataAccountV2Instruction(
            {
                metadata: metadataPDA,
                updateAuthority: user.publicKey,
            },
            {
                updateMetadataAccountArgsV2: {
                    data: tokenMetadata,
                    updateAuthority: user.publicKey,
                    primarySaleHappened: true,
                    isMutable: true,
                },
            }
        )
    );

    // send transaction
    const transactionSignature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [user]
    );

    console.log(
        `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    )
}

async function main() {
    // const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
    // const user = await initializeKeypair(connection);
    //
    // console.log("PublicKey:", user.publicKey.toBase58());
    //
    // const mint = await createNewMint(
    //     connection,
    //     user,           // We'll pay the fees
    //     user.publicKey, // We're the mint authority
    //     user.publicKey, // And the freeze authority >:)
    //     2               // Only two decimals!
    // );
    //
    // const tokenAccount = await createTokenAccount(
    //     connection,
    //     user,
    //     mint,
    //     user.publicKey   // Associating our address with the token account
    // );
    //
    // // Mint 100 tokens to our address
    // await mintTokens(connection, user, mint, tokenAccount.address, user, 100);
    //
    //
    // const receiver = web3.Keypair.generate().publicKey;
    //
    // const receiverTokenAccount = await createTokenAccount(
    //     connection,
    //     user,
    //     mint,
    //     receiver
    // );
    //
    // await transferTokens(
    //     connection,
    //     user,
    //     tokenAccount.address,
    //     receiverTokenAccount.address,
    //     user.publicKey,
    //     50,
    //     mint
    // );
    //
    // await burnTokens(connection, user, tokenAccount.address, mint, user, 25)

    const connection = new web3.Connection(web3.clusterApiUrl("devnet"))
    const user = await initializeKeypair(connection)

    console.log("PublicKey:", user.publicKey.toBase58())

    // MAKE SURE YOU REPLACE THIS ADDRESS WITH YOURS!
    const MINT_ADDRESS = "62Ko4R4uFdPWr8qV53xXkWa5iksAWnRbEzgHfrNPGMvy"

    // metaplex setup
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(user))
        .use(
            bundlrStorage({
                address: "https://devnet.bundlr.network",
                providerUrl: "https://api.devnet.solana.com",
                timeout: 60000,
            })
        )

    // Calling the token
    await createTokenMetadata(
        connection,
        metaplex,
        new web3.PublicKey(MINT_ADDRESS),
        user,
        "Oorbit", // Token name - REPLACE THIS WITH YOURS
        "OORB",     // Token symbol - REPLACE THIS WITH YOURS
        "Not just an orbit but an oorbit." // Token description - REPLACE THIS WITH YOURS
    )

}

main();
