const { Builder } = require('selenium-webdriver');
const cheerio = require('cheerio');

async function getToxicitySummaryText(compoundId) {
    let driver = await new Builder().forBrowser('chrome').build();
    let toxicityText = "";

    try {
        // Construct the URL based on the compound ID
        const url = `https://pubchem.ncbi.nlm.nih.gov/compound/${compoundId}#section=Toxicity-Summary&fullscreen=true`;

        // Open the webpage
        await driver.get(url);

        // Wait for content to load (adjust time as necessary)
        await driver.sleep(10000); // Adjust the wait time as needed (in milliseconds)

        // Get the page source
        const pageSource = await driver.getPageSource();

        // Use cheerio to parse the HTML and extract the content
        const $ = cheerio.load(pageSource);

        // Find the Toxicity Summary section
        const toxicitySection = $('#Toxicity-Summary');
        if (toxicitySection.length > 0) {
            // Get the text content of the section
            toxicityText = toxicitySection.text().trim();
        } else {
            toxicityText = "Toxicity Summary section not found!";
        }
    } catch (error) {
        toxicityText = `Error: ${error.message}`;
    } finally {
        // Close the browser
        await driver.quit();
    }

    return toxicityText;
}

// Example usage
getToxicitySummaryText(2244).then(text => {
    console.log("Toxicity Summary Text: ");
    console.log(text);
});
