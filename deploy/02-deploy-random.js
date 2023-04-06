const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const {storeImages, storeTokenUriMetadata} = require("../utils/uploadToPinata")
require("dotenv").config()

const imagesLocation = "./images/randomNft"


const FUND_AMOUNT = "1000000000000000000000"

const metadataTemplate = {
    name: "",
    description:"",
    image:"",
    attributes: [
        {
            trait_types: "Cuteness",
            value: 100,
        }
    ]

}


module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const{ deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock
    if (process.env.UPLOAD_TO_PINATA == "true"){
        tokenUris = await handleTokenUris()
    }

    if (chainId == 31337) {
        // create VRFV2 Subscription
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        // Our mock makes it so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }
    
    await storeImages(imagesLocation)
    log("------------------------------")

    console.log(networkConfig[chainId].vrfCoordinatorV2Address)
     const args = [
         vrfCoordinatorV2Address, 
         subscriptionId, 
         networkConfig[chainId].gasLane,
         networkConfig[chainId].mintFee,
         networkConfig[chainId].callbackGasLimit,
         tokenUris,
      
      
         
         ]

           //  constructor(
        //     address vrfCoordinatorV2, 
        //     uint64 subscriptionId, 
        //     bytes32 gasLane,
        //     uint32 callbackGasLimit,
        //     string[3] memory dogTokenUris,
        //     uint256 mintFee
        //     ) 



         const randomIpfsNft = await deploy("RandomIpfsNft", {
            from: deployer,
            args: args,
            log: true,
        waitConfirmations: network.config.blockConfirmations || 1
         })
         log("---------------------")

         if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
            log("Verifying...")
            await verify(randomIpfsNft.address, args)
        }

        // await vrfCoordinatorV2Mock.addConsumer(
        //     subscriptionId,
        //     randomIpfsNft.address
        // )
}   




async function handleTokenUris() {
    tokenUris = []
    
    const {responses:imageUploadResponses, files} = await storeImages(imagesLocation)   
    for (imageUploadResponseIndex in imageUploadResponses) {

        let tokenUriMetadata = { ...metadataTemplate }
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} puppy!`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name}...`)
        // store the JSON to pinata
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("tokenUris Uploaded")
    console.log(tokenUris)

    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
