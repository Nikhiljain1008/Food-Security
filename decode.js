import { MultiFormatReader, DecodeHintType, BarcodeFormat, RGBLuminanceSource, HybridBinarizer } from '@zxing/library';

/**
 * Function to decode a barcode from an uploaded image file.
 * @param {File} fileInput - The input file (image) from the user.
 * @param {HTMLElement} resultDisplay - The element where the decoded result will be displayed.
 */
async function decodeBarcodeFromImage(fileInput, resultDisplay) {
    if (!fileInput.files[0]) {
        resultDisplay.textContent = "Please select an image file.";
        return;
    }

    const reader = new FileReader();

    reader.onload = async function (e) {
        const imageData = e.target.result;

        try {
            // Create the MultiFormatReader
            const codeReader = new MultiFormatReader();
            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.QR_CODE]);
            codeReader.setHints(hints);

            // Convert image data to RGB Luminance source and process
            const image = new Image();
            image.src = imageData;

            image.onload = async function() {
                const luminanceSource = new RGBLuminanceSource(image, image.width, image.height);
                const binarizer = new HybridBinarizer(luminanceSource);
                const binaryBitmap = new BinaryBitmap(binarizer);

                // Decode the barcode
                const result = await codeReader.decode(binaryBitmap);

                // Display the decoded barcode
                resultDisplay.textContent = `Result: ${result.getText()}`;
            };
        } catch (error) {
            resultDisplay.textContent = "No barcode detected or invalid file.";
            console.error("Error decoding barcode:", error);
        }
    };

    // Read the file as a data URL
    reader.readAsDataURL(fileInput.files[0]);
}


export { decodeBarcodeFromImage };