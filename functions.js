import { Builder, By, until } from 'selenium-webdriver';
// import cheerio from 'cheerio';
import { load } from 'cheerio';
// import fs from 'node:fs';
import { promises as fs } from 'fs';
import { writeFile } from 'fs/promises';
import { ask } from './gemini_api.js';
import sharp from 'sharp';
import { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, HybridBinarizer, BinaryBitmap } from '@zxing/library';
// let chrome;

// // Use async function to import chrome
// async function initChrome() {
//     chrome = await import('selenium-webdriver/chrome.js');
//     console.log("chrome imported successfully");
// }

// initChrome();

let firefox;

// Use async function to import firefox
async function initFirefox() {
    firefox = await import('selenium-webdriver/firefox.js');
    console.log("Firefox imported successfully");
}

initFirefox();


// Function to fetch food information
async function getFoodInfo(foodItemName) {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(foodItemName)}.json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Error fetching data. Please check the food item name.");
        }
        const data = await response.json();
        // writeJsonToFile('data.json', data);
        // const product = data.product || {};

        // return { ingredients, additives, image_front_url };
        return data;
    } catch (error) {
        console.error(error.message);
        return { ingredients: null, additives: null };
    }
}

// const writeJsonToFile = async (fileName, jsonObject) => {
//     try {
//         // Convert the JSON object to a string
//         const jsonString = JSON.stringify(jsonObject, null, 4); // Pretty-print with 4 spaces
//         await writeFile(fileName, jsonString); // Use async/await to write to the file
//         console.log(`JSON saved to ${fileName}`);
//     } catch (err) {
//         console.error("Error writing file:", err);
//     }
// };

async function getCID(ingredient) {
    console.log("Inside getCID function");
    try {
      // Step 1: Search for the compound by name to get its CID
      const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(ingredient)}/JSON`;
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) throw new Error("Ingredient not found in PubChem.");
  
      const searchData = await searchResponse.json();
      const compoundCID = searchData?.PC_Compounds?.[0]?.id?.id?.cid;
      console.log("For ingredient: ", ingredient);
      console.log("CompunedCID   : ", compoundCID);
  
      return compoundCID;
    } catch (error) {
      console.error("Error:", error.message);
      return 0;
    }
}

// getCID("maltitol");

async function getToxicitySummaryText(compoundId) {
    console.log("--- reached main toxicity function ---");
    // Set up the Chrome options to run in headless mode
    // let chrome = require('selenium-webdriver/chrome');
    // const chrome = await import('selenium-webdriver/chrome');

    // try {
    //     const chrome = await import('selenium-webdriver/chrome');
    //     console.log("chrome imported successfully (internal)");
    // } catch (err) {
    //     console.error("Error importing selenium-webdriver/chrome:", err.message);
    // }
    

    // console.log("chrome imported successfully");
    // let options = new chrome.Options();
    let options = new firefox.Options();
    // let options = Options();
    // options.addArguments('--headless'); // Run in headless mode
    options.addArguments('--disable-gpu'); // Optional: disable GPU usage for better compatibility
    options.addArguments('--no-sandbox'); // Optional: improves security in certain environments
    options.addArguments('--disable-dev-shm-usage'); // Optional: handles memory issues in containerized environments

    // Initialize the driver with headless options
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    let toxicityText = "";
    let toxicityQuery = "";

    try {
        // Construct the URL based on the compound ID
        const url = `https://pubchem.ncbi.nlm.nih.gov/compound/${compoundId}#section=Toxicity-Summary&fullscreen=true`;

        console.log(`URL: ${url}`);

        // Open the webpage
        await driver.get(url);

        // Wait for content to load (adjust time as necessary)
        await driver.sleep(7000); // Adjust wait time as needed

        // Get the page source
        const pageSource = await driver.getPageSource();

        // Use cheerio to parse the HTML and extract the content
        // const $ = cheerio.load(pageSource);
        const $ = load(pageSource);
        // console.log("Source : ", $('#Toxicity-Summary'));

        // Find the Toxicity Summary section
        let toxicitySection = $('#Toxicity-Summary');
        if (toxicitySection.length > 0) {
            toxicityText = toxicitySection.text().trim();
            // toxicityQuery = "Summaries this text and return what disease it can cause to a human being in four line : | " + toxicityText + " | at any cost don't add your own information only give information prresent in given text";
            // toxicityText = await ask(toxicityQuery);
            // console.log("--- Gemini : ", toxicityText);
        } else if(toxicitySection.length <= 0) {

            // Construct the URL based on the compound ID
            const url = `https://pubchem.ncbi.nlm.nih.gov/compound/${compoundId}#section=Toxicological-Information&fullscreen=true`;

            console.log(`URL: ${url}`);
            await driver.get(url);
            await driver.sleep(7000);
            const pageSource = await driver.getPageSource();
            const $ = load(pageSource);


            toxicitySection = $('#Toxicological-Information');
            if (toxicitySection.length > 0) {
                toxicityText = toxicitySection.text().trim();
                // toxicityQuery = "Summaries this text and return what disease it can cause in four line : " + toxicityText;
                // toxicityText = await ask(toxicityQuery);
            }
            else{
                toxicityText = `Toxicity Summary section not found ${compoundId}!`;

                // Save the HTML for debugging
                const filePath = `./debug_pages/compound_${compoundId}.html`;
                try {
                    await fs.writeFile(filePath, pageSource);
                    console.log(`Saved HTML to ${filePath}`);
                } catch (fileError) {
                    console.error(`Failed to save HTML for ${compoundId}: ${fileError.message}`);
                }
            }
        } else {
            toxicityText = `Toxicity Summary section not found ${compoundId}!`;
        }
    } catch (error) {
        toxicityText = `Error: ${error.message}`;
    } finally {
        // Close the browser
        await driver.quit();
    }


    // console.log(`Compound Id : ${compoundId}`);
    // console.log(`toxicity text : ${toxicityText}`);
    return toxicityText;
}

async function getFinalResult(combine_toxicity) {
    let query = "";
    let final_result = "";
    try{
        let prompt = "Based on the provided toxicity information of individual food ingredients, identify the potential diseases or health conditions that could result from consuming this food product. If toxicity data is incomplete, use only the available information to provide disease-related outcomes.";
        prompt += " | answer in precise word to understanding disease it may cause, in 10 lines | INFO : ";
        console.log("Prompt -> ", prompt);

        query = prompt + combine_toxicity;
        // console.log("Query: --> ", query);
        final_result = await ask(query);
        return final_result;
    } catch {
        console.log("Error getting result in main get function");
        return final_result;
    }
}

// getToxicitySummaryText(168010143);

async function decodeBarcodeFromImage(imageBuffer) {
    try {
        console.log("reached main decoding function -----");
        // Create the MultiFormatReader
        const codeReader = new MultiFormatReader();
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.QR_CODE]);
        codeReader.setHints(hints);

        console.log("converting buffer -----");

        // Convert the buffer to a luminance source for processing
        const image = new Image();
        const imageDataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        image.src = imageDataUrl;

        // await new Promise((resolve, reject) => {
        //     image.onload = resolve;
        //     image.onerror = reject;
        // });

        await new Promise((resolve, reject) => {
            image.onload = () => {
                console.log("Image successfully loaded", image);
                resolve();
            };
            image.onerror = (error) => {
                console.error("Error loading image:", error);
                reject(error);
            };
        });

        const luminanceSource = new RGBLuminanceSource(image, image.width, image.height);
        const binarizer = new HybridBinarizer(luminanceSource);
        const binaryBitmap = new BinaryBitmap(binarizer);

        // Decode the barcode
        const result = await codeReader.decode(binaryBitmap);

        // Return the barcode number (text)
        return result.getText();
    } catch (error) {
        console.error("Error decoding barcode:", error);
        return null;
    }
}

// const decodeBarcodeFromImage = async (imageBuffer) => {
//     try {
//         // Debugging: Log the imageBuffer to ensure it’s valid
//         console.log('Received image buffer:', imageBuffer);

//         // Process the image buffer using sharp
//         const processedImage = await sharp(imageBuffer)
//             .resize(600) // Optional: resize the image
//             .greyscale() // Convert the image to grayscale for better barcode detection
//             .normalize() // Normalize the image to enhance the barcode contrast
//             .toBuffer(); // Get the image buffer for barcode decoding


//         // Debugging: Log the processed image buffer
//         console.log('Processed image buffer:', processedImage);

//         // Create the MultiFormatReader for barcode decoding
//         const codeReader = new MultiFormatReader();
//         const hints = new Map();
//         hints.set(DecodeHintType.POSSIBLE_FORMATS, [
//             BarcodeFormat.CODE_128,
//             BarcodeFormat.EAN_13,
//             BarcodeFormat.QR_CODE,
//             BarcodeFormat.CODE_39,
//             BarcodeFormat.UPC_A,
//             BarcodeFormat.UPC_E,
//             BarcodeFormat.EAN_8
//         ]);
        
//         codeReader.setHints(hints);

//         // Create luminance source
//         const luminanceSource = new RGBLuminanceSource(processedImage, 600, 600); // Adjust width and height accordingly
//         console.log('Luminance source:', luminanceSource);

//         const binarizer = new HybridBinarizer(luminanceSource);
//         const binaryBitmap = new BinaryBitmap(binarizer);
//         console.log('Binary bitmap:', binaryBitmap);

//         // Decode the barcode
//         const result = await codeReader.decode(binaryBitmap);

//         // Return the barcode number (text)
//         return result.getText();
//     } catch (error) {
//         console.error("Error decoding barcode:", error);
//         return null;
//     }
// };


export { getFoodInfo, getCID, getToxicitySummaryText, getFinalResult, decodeBarcodeFromImage };
