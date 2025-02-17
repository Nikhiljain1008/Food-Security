async function getToxicityInfo(ingredient) {
    try {
      // Step 1: Search for the compound by name to get its CID
      const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(ingredient)}/JSON`;
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) throw new Error("Ingredient not found in PubChem.");
  
      const searchData = await searchResponse.json();
      const compoundCID = searchData?.PC_Compounds?.[0]?.id?.id?.cid;
      console.log("CompunedCID : ", compoundCID);
  
      if (!compoundCID) throw new Error("CID not found for the ingredient.");
  
      // Step 2: Use the CID to fetch compound summary (including toxicity information)
      const summaryUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compoundCID}/JSON`;
    //   const summaryUrl = `https://comptox.epa.gov/dashboard/api/chemicaldetails?identifier=${compoundCID}&type=cid`;
      const summaryResponse = await fetch(summaryUrl);
      if (!summaryResponse.ok) throw new Error("Failed to fetch compound summary.");
  
      const summaryData = await summaryResponse.json();
      const properties = summaryData?.Record?.Section || [];

      const summaryText = JSON.stringify(summaryData);
      // console.log("Summary: ", summaryText);
  
      // Step 3: Extract toxicity-related information
      const toxicityInfo = properties.find(section => 
        section.TOCHeading.toLowerCase().includes("toxicity")
      );
  
      if (toxicityInfo) {
        console.log("Toxicity Information:", toxicityInfo);
        return toxicityInfo;
      } else {
        console.log("No specific toxicity information found for this ingredient.");
        return "No specific toxicity information available.";
      }
    } catch (error) {
      console.error("Error:", error.message);
      return error.message;
    }
  }
  
  // Example Usage
  // getToxicityInfo("Palm Oil").then(info => {
  getToxicityInfo("e322").then(info => {
    console.log("Result:", info);
  });
  

  // function download(content, fileName, contentType) {
  //   var a = document.createElement("a");
  //   var file = new Blob([content], {type: contentType});
  //   a.href = URL.createObjectURL(file);
  //   a.download = fileName;
  //   a.click();
// }
