import express from 'express';
import cors from 'cors';
import * as functions from './functions.js';
import bodyParser from 'body-parser';
import multer from 'multer';


const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Middleware to log the requested route
const logRoute = (req, res, next) => {
    const timestamp = new Date().toISOString(); // Get current timestamp
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next(); // Pass control to the next middleware/route handler
};

app.use(logRoute);

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

// // Route to handle file upload
// app.post('/get-barcode-no', upload.single('file'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ error: 'No file uploaded' });
//     }

//     // Process the file to extract the barcode number
//     const barcodeNumber = functions.decodeBarcodeFromImage(req.file.buffer);

//     if (barcodeNumber) {
//         res.json({ barcodeNumber });
//     } else {
//         res.status(500).json({ error: 'Failed to extract barcode number', barcodeNumber: "0102" });
//     }
// });

app.post('/get-barcode-no', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;

    // Validate that the file is an image
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type. Please upload an image.' });
    }

    console.log('Uploaded file:', file);

    // Process the file to extract the barcode number
    const barcodeNumber = await functions.decodeBarcodeFromImage(file.buffer);

    if (barcodeNumber) {
        res.json({ barcodeNumber });
    } else {
        res.status(500).json({ error: 'Failed to extract barcode number', barcodeNumber: "0102" });
    }
});



app.get('/getFoodInfo/:foodItemName', async (req, res) => {
    const foodItemName = req.params.foodItemName;

    console.log(`Get Food request: ${foodItemName}`);

    try{
        const data = await functions.getFoodInfo(foodItemName);
        // console.log("ingredient at express: ", data.product.ingredients_text);
        res.json( data );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.get('/toxicity-summary-id/:compoundId', async (req, res) => {
    const compoundId = req.params.compoundId;

    console.log(`Get Toxic request: ${compoundId}`);

    try {
        console.log("trying to get summary");
        const summaryText = await functions.getToxicitySummaryText(compoundId);
        // console.log(`Summary: ${summaryText}`);
        res.json({ toxicitySummary: summaryText });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/toxicity-summary-name/:ingredientName', async (req, res) => {
    const ingredientName = req.params.ingredientName;
    let compoundId = 0;

    console.log(`--- Request Toxicity by Name -> ${ingredientName}`);

    try {
        compoundId = await functions.getCID(ingredientName);
        if (compoundId == 0) {
            // throw new Error("Invalid compound ID returned.");
            console.log("-----------------------------------------------------");
            console.log("");
            return res.json({ toxicitySummary: "Ingredient not found in PubChem." });
        }

        try {
            console.log(`Trying to get summary of ${ingredientName} with compoundId ${compoundId}`);
            const summaryText = await functions.getToxicitySummaryText(compoundId);
            // console.log(`Summary: ${summaryText}`);
            res.json({ toxicitySummary: summaryText });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } catch(error) {
        res.status(500).json({ error: "Unable to get CID"});
    }

    console.log("-----------------------------------------------------");
    console.log("");  
});

app.post('/final-result', async (req, res) => {
    const { combine_toxicity } = req.body;
    let final_result = "";

    try{
        console.log("Request to get Final result ---");
        final_result = await functions.getFinalResult(combine_toxicity);
        res.json({ finalResult: final_result });
    } catch {
        console.log("Error getting combine result");
        res.json({ finalResult : "Error getting final result"});
    }

})

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
