const pinataSDK = require("@pinata/sdk")
const path = require("path")
const fs = require("fs")

const pinataApiKey = process.env.PINATA_API_KEY
const pinataApiSecret = process.env.PINATA_SECRET
const pinata = pinataSDK(pinataApiKey, pinataApiSecret)

async function storeImages(imagesFilePath){
    const fullImagesPath = path.resolve(imagesFilePath)
    const files = fs.readdirSync(fullImagesPath)
    let responses = []
    console.log("UploadingToIpfs")
    for (fileIndex in files){
        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`)
        try{
            const response = await pinata.pinFileToIPFS(readableStreamForFile)
            responses.push(response)
        } catch(error){
            console.log(error)
        }
    }
    return { responses, files}
}   


async function storeTokenUriMetadata(metadata){
    try{
        const response = await pinata.pinJSONToIPFS(metadata)
        return response
    }catch (error) {
        console.log(error)
    }
}

module.exports = {storeImages, storeTokenUriMetadata}