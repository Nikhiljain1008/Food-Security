document.addEventListener("DOMContentLoaded", () => {
    // Select the form and elements
    const form = document.querySelector("form");
    const subDivs = document.querySelectorAll(".subDiv");
    const subDiv1 = document.querySelectorAll(".subDiv1");
    const subDiv2 = document.querySelectorAll(".subDiv2");
    const subDiv3 = document.querySelectorAll(".subDiv3");
    const containsPara = document.querySelector(".contains_para");
    const image_src = document.querySelector(".food_img");
    const msgDiv = document.querySelector(".msgDiv");
    const outputMsg = document.querySelector(".msgDiv p")

    // Function to show the loading spinner inside each subDiv
    function showLoading(className) {
        className.forEach((div) => {
            const loadingSpinner = document.createElement("div");
            loadingSpinner.className = "lds-ellipsis";
            loadingSpinner.innerHTML = "<div></div><div></div><div></div><div></div>";
            div.appendChild(loadingSpinner);
        });
    }

    // Function to remove the loading spinner from each subDiv
    function hideLoading(className) {
        className.forEach((div) => {
            const spinner = div.querySelector(".lds-ellipsis");
            if (spinner) {
                div.removeChild(spinner);
            }
        });
    }

    // Handle form submission
    form.addEventListener("submit", async (event) => {
        event.preventDefault(); // Prevent page reload

        //  // Get references to file input and barcode input
        // const fileInput = form.querySelector("#formFile");
        // const barcodeInput = form.querySelector("input[type='text']");

        // // Check if both file and barcode are empty
        // if (!fileInput.files.length && !barcodeInput.value.trim()) {
        //     document.querySelector(".msgDiv").textContent = "Please provide either a file or a barcode.";
        //     return; // Stop further execution
        // }

        image_src.style.display = "none";

        const progressBar = document.querySelector('.progressBar');
        progressBar.style.display = 'block';
        let progress = 0;

        let foodItemName = "";
        // if(fileInput.files.length > 0){
        //     const file = fileInput.files[0];
        //     console.log("Requesting server to get code from image");
        //     foodItemName = await sendFileToServer(file);
        //     console.log("Get Code : ", foodItemName);
        // }
        // else{
            // Get the food item name from the input field
            foodItemName = form.querySelector("#barcode_input").value.trim();
            console.log("Submition: ", foodItemName);
        // }

        // Clear previous results and show the loading spinner
        containsPara.textContent = "";
        showLoading(subDiv1);
        showLoading(subDiv2);
        showLoading(subDiv3);


        // if (!foodItemName) {
        //     containsPara.textContent = "Please enter a food item name.";
        //     hideLoading(); // Hide spinner if no input
        //     return;
        // }

        try {
            // Call the API function to get the food information
            const foodInfo = await getFoodInfo(foodItemName);

            // Display the result in the contains_para element
            if (foodInfo.ingredients) {
                containsPara.innerHTML = `<u>Ingredients</u>: ${foodInfo.ingredients}`;
            } else {
                containsPara.innerHTML = "No information found for this food item.";
            }

            // Append additives information on a new line if available
            if (foodInfo.additives) {
                containsPara.innerHTML += `<br><u>Additives</u>: ${foodInfo.additives}`;
            }

            // Update the image source
            if (foodInfo.image_front_url) {
                image_src.src = foodInfo.image_front_url;
            }

            progress = 10;
            setProgress(progress)

            // const result_array = extractIngredientsAndAdditives(foodInfo.ingredients, foodInfo.additives);
            // const result_array = combineArrays(foodInfo.ingredients, foodInfo.additives);
            // saveJsonToFile(foodInfo)
            let result_array = extractTextArray(foodInfo);
            result_array = addEBeforeNumbers(result_array);
            console.log("Array: ", result_array);
            const eachProgress = 90 / result_array.length;


            // fetchToxicitySummaryById(168010143);
            // fetchToxicitySummaryById(2244);
            // fetchToxicitySummaryByName(result_array[4])
            hideLoading(subDiv1);
            image_src.style.display = "block";
            hideLoading(subDiv2);

            let combine_toxicity = "";
            let curr_toxicity = "";
            for (const name of result_array) {
                try {
                    curr_toxicity = await fetchToxicitySummaryByName(name);
                    console.log(`Toxicity summary for ${name} Done`);
                } catch (error) {
                    console.error(`Error fetching toxicity summary for ${name}:`, error.message);
                }
                progress = progress + eachProgress;
                setProgress(progress);

                combine_toxicity += curr_toxicity;
            }

            console.log("Complete with toxic fetching");
            let finalResult = await getFinalResult(combine_toxicity);
            finalResult = formatTextForInnerHTML(finalResult);
            document.querySelector(".toxicity_para").innerHTML = finalResult;

            console.log("--- Done ---");
            const disease_result = await get_high_disease(combine_toxicity);
            console.log("Spacy_result at frontend : ", disease_result);
            
            msgDiv.style.display = 'block';
            outputMsg.innerText = disease_result;
            

        } catch (error) {
            console.error("Error fetching food information:", error);
            document.querySelector(".msgDiv").textContent = "An error occurred while fetching the information.";
        } finally {
            setProgress(0);
            progressBar.style.display = 'none';
            hideLoading(subDiv3); // Hide the spinner after response is received
        }
    });
});

// ------ Functions --------------

// Function to fetch food information
async function getFoodInfo(foodItemName) {
    // const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(foodItemName)}.json`;
    const url = `http://localhost:3000/getFoodInfo/${foodItemName}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Error fetching data. Please check the food item name.");
        }
        const data = await response.json();
        const product = data.product || {};

        console.log("ingredient at frontend: ", data.product.ingredients_text);

        // Extract ingredients and additives
        const ingredients = product.ingredients_text || "Ingredients not available";
        const additives = product.additives_tags ? product.additives_tags.join(", ") : "No additives available";
        const image_front_url = product.image_front_url || "./../static/images/default_food.png";
        const ingredient_array = product.ingredients || "No array found";

        return { ingredients, additives, image_front_url, ingredient_array };
    } catch (error) {
        console.error(error.message);
        return { ingredients: null, additives: null };
    }
}


async function fetchToxicitySummaryById(compoundId) {
    try {
        const url = `http://localhost:3000/toxicity-summary-id/${compoundId}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error fetching toxicity summary: ${response.statusText}`);
        }
        
        const data = await response.json();
        // console.log("Toxicity Summary:", data.toxicitySummary);
        const main_effects = extractMainEffects(data.toxicitySummary);
        
        document.querySelector(".toxicity_all_info").innerText = main_effects;
        
    } catch (error) {
        console.error("Error:", error);
    }
}

async function fetchToxicitySummaryByName(ingredientName) {
    document.querySelector(".toxicity_all_info").innerText += `-------- ${ingredientName} -----------`;
    document.querySelector(".toxicity_all_info").innerHTML += "</br>";
    try {
        const url = `http://localhost:3000/toxicity-summary-name/${ingredientName}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error fetching toxicity summary: ${response.statusText}`);
        }
        
        const data = await response.json();
        // console.log("Toxicity Summary:", data.toxicitySummary);
        // const main_effects = extractMainEffects(data.toxicitySummary);
        
        document.querySelector(".toxicity_all_info").innerText += data.toxicitySummary;
        document.querySelector(".toxicity_all_info").innerHTML += "</br>";
        return data.toxicitySummary;      
    } catch (error) {
        console.error("Error:", error);
        return "";
    }
}

async function getFinalResult(combine_toxicity){
    // console.log("combine toxicity inside get function: ", combine_toxicity);
    try {
        const response = await fetch(`http://localhost:3000/final-result`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ combine_toxicity }) 
        });
        if (!response.ok) {
            throw new Error(`Error fetching toxicity summary: ${response.statusText}`);
        }
        
        const data = await response.json();
       
        return data.finalResult;      
    } catch (error) {
        console.error("Error:", error);
        return "";
    }
}

async function get_high_disease(combine_toxicity){
    try {
        const response = await fetch(`http://127.0.0.1:5000/get_high_disease`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ combine_toxicity })
        });

        if (!response.ok) {
            throw new Error(`Error fetching toxicity summary: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Received Data:", data);
        console.log("Received Diseases: ", data.disease_entities);
       
        return data.disease_entities;
    } catch(error) {
        console.log("Error: ", error);
        return "";
    }
}

// function extractIngredientsAndAdditives(ingredients, additives) {
//     // Extract ingredients by splitting the string based on commas, removing extra spaces, and filtering out unnecessary parts
//     const ingredientList = ingredients
//         .replace(/emulsifiers \(\d+(, \d+)*\)/g, '')  // Remove emulsifier parentheses
//         .replace(/artificial flavouring substances \((.*?)\)/g, '$1')  // Extract flavours
//         .replace('CONTAINS NATURALLY OCCURRING SUGARS', '')  // Remove sugar note
//         .replace(/[.']+/g, '')  // Remove unwanted periods and quotes
//         .split(',')
//         .map(item => item.trim())  // Clean up extra spaces
//         .filter(item => item && item !== '');  // Remove empty strings and unwanted elements

//     // Extract additives, assuming they are in the format "en:e322"
//     const additiveList = additives
//         .split(',')
//         .map(additive => additive.replace('en:', '').trim())  // Remove 'en:' prefix
//         .filter(item => item && item !== '');  // Remove empty strings and unwanted elements

//     // Combine ingredients and additives into a single list
//     const result = [...ingredientList, ...additiveList];

//     return result;
// }

async function sendFileToServer(file) {
    try {
        const formData = new FormData();
        formData.append('file', file); // Append the file to the FormData object

        const response = await fetch('http://localhost:3000/get-barcode-no', {
            method: 'POST',
            body: formData, // Send the form data (file) to the server
        });

        // Check if the response is successful
        if (!response.ok) {
            throw new Error('Failed to retrieve barcode number');
        }

        // Parse the JSON response from the server
        const data = await response.json();

        console.log("Received code: ", data.barcodeNumber);

        // Return the barcode number
        return data.barcodeNumber; // Assuming the server responds with { barcodeNumber: <number> }
    } catch (error) {
        console.error('Error sending file:', error);
        return null;
    }
}


function extractTextArray(product) {
    if (!product.ingredient_array || !Array.isArray(product.ingredient_array)) {
        console.log("array doesn't exsist");
        return [];
    }

    // Extract 'text' field and ensure the result is an array
    return product.ingredient_array.reduce((acc, ingredient) => {
        if (ingredient.text) {
            acc.push(ingredient.text);
        }
        return acc;
    }, []);
}

function addEBeforeNumbers(arr) {
    return arr.map(element => {
        // Check if the element is a valid number (not NaN) and is not empty
        if (!isNaN(element) && element.trim() !== "") {
        return "e" + element;  // Add "e" before the number
        }
        return element;  // Keep the element unchanged if it's not a number
    });
}

function formatTextForInnerHTML(text) {
    const escapeHTML = (str) =>
        str.replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#39;");
    
    let escapedText = escapeHTML(text);

    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    escapedText = escapedText.replace(/(\.)([^\s])/g, "$1 $2");
    escapedText = escapedText.replace(/\n/g, "<br>");

    return escapedText;
}

function saveJsonToFile(jsonObject, fileName = "data@frontend.json") {
    // Convert the JSON object to a string
    const jsonString = JSON.stringify(jsonObject, null, 2); // Pretty print with 2 spaces
  
    // Create a Blob with the JSON string and specify the MIME type
    const blob = new Blob([jsonString], { type: "application/json" });
  
    // Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);
  
    // Create an anchor element
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName; // Set the file name
  
    // Append the anchor to the document body (optional for compatibility)
    document.body.appendChild(a);
  
    // Programmatically click the anchor to trigger the download
    a.click();
  
    // Clean up by revoking the object URL and removing the anchor
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

// function combineArrays(ingredient, additives) {
//     // Helper function to process a string
//     function processString(input) {
//         return input
//             .split(',') // Split by commas
//             .map(item => item.trim()) // Remove extra spaces
//             .map(item => {
//                 // If the element contains a colon, use the part after the colon
//                 if (item.includes(':')) {
//                     return item.split(':').pop().trim();
//                 }
//                 return item;
//             })
//             .map(item => item.replace(/\([^)]*\d[^)]*\)/g, '').trim()) // Remove text in parentheses if it contains numbers
//             .filter(item => item); // Remove empty strings
//     }

//     const ingredientArray = processString(ingredient);
//     const additivesArray = processString(additives);

//     return [...ingredientArray, ...additivesArray];
// }

function extractMainEffects(text) {
    // Define a regular expression pattern to match the section that describes the main effects.
    const mainEffectsPattern = /(?:principal primary effects of[^:]*:|Summary of clinical effects:)[^]*?(?=Effects on blood glucose|Absorption by route|$)/g;

    // Match the section of the text that lists the main effects
    const mainEffectsSection = text.match(mainEffectsPattern);
    
    if (mainEffectsSection && mainEffectsSection.length > 0) {
        // Extract the main effects description
        const effectsText = mainEffectsSection[0];

        // Split the text into individual effects based on punctuation or bullet points (typically commas or semicolons).
        const effectsList = effectsText
            .replace(/(?:^|\n)[^\w]*[A-Za-z]/g, '') // Remove bullet points and unnecessary characters
            .split(/;\s*|\.\s*/g) // Split by semicolons or periods to isolate effects
            .map(effect => effect.trim()) // Trim whitespace from each effect
            .filter(Boolean); // Filter out any empty strings

        // Join the effects into a single string, separated by semicolons or newlines
        return effectsList.join('; ');
    }
    
    return ''; // Return an empty string if no main effects are found
}

function setProgress(progress) {
    const progressBar = document.querySelector('.progressBar');
    progressBar.style.width = `${progress}%`; // Set the width based on the input value
  }