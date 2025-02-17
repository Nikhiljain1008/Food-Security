// Function to fetch toxicity data from PubChem API
async function getToxicityData(cid) {
    try {
        const response = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/GHSClassification/JSON`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Extract toxicity information (GHS Classification)
        if (data && data.PropertyTable && data.PropertyTable.Properties.length > 0) {
            const toxicity = data.PropertyTable.Properties[0].GHSClassification;
            console.log(`Toxicity for CID ${cid}:`, toxicity);
            return toxicity;
        } else {
            console.log(`No toxicity data found for CID ${cid}`);
        }
    } catch (error) {
        console.error(`Error fetching toxicity data for CID ${cid}:`, error);
    }
}

// Example usage
const cid = 481187697; // Replace with the CID of the ingredient
getToxicityData(cid);
