from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
# import scispacy
import spacy

app = Flask(__name__)
CORS(app)

try:
    nlp = spacy.load("en_ner_bc5cdr_md")
    print("Model loaded successfully!")
except Exception as e:
    print(f"--- ??? Error loading model: ??? --->> {e}")

# Define a function to extract disease-related entities
def extract_disease_entities(text):
    # Process the text using the SpaCy model
    doc = nlp(text)
    
    # Extract and return only disease-related entities
    disease_entities = [ent.text for ent in doc.ents if ent.label_ == "DISEASE"]
    return disease_entities


# text = "HUMAN EXPOSURE AND TOXICITY: All the vegetable oils (olive, soybean and palm), fresh and deep-fried, produced an increase in the triglyceride plasma levels in healthy subjects. Palm and partially hydrogenated soybean oils, compared with soybean and canola oils, adversely altered the lipoprotein profile in moderately hyperlipidemic subjects without significantly affecting HDL intravascular processing markers. Red palm oil supplementation significantly improved maternal and neonatal vitamin A status and reduced the prevalence of maternal anemia. Maternal vitamin A status in the later part of pregnancy is significantly associated with fetal growth and maturation. The replacement of dietary fat by palm oil in a double-blind study with groups of 17-20 male volunteers in two 6-week experimental periods resulted in a reduction of the relative TNF response, measured in-vitro in whole blood samples stimulated with lipopolysaccharide. The production of other cytokines (IL-6 and IL-8) was not affected. In epidemiological studies palm oil users were more likely to have myocardiol infarction than users of soybean oil. The components of palm oil tocotrienols induced apoptosis in human colorectal adenocarcinoma cell line and modulated gene expression in human breast cancer cell lines. However oxidized palm oil include toxicants. ANIMAL STUDIES: In experiments on rats it was shown that fresh palm oil has no deleterious effects on blood pressure and cardiac tissue but prolonged consumption of repeatedly heated palm oil may result in an increase in blood pressure level with necrosis of cardiac tissue. Feeding of discarded frying palm oil to rats at a level of 20% in the diet for 28 days had no effects on growth or heart and thymus indices, but significantly reduced the spleen index. The reproductive toxicity of palm oil and its effects on newborns fed the same diet were also evaluated. No adverse effects were observed in the experimental groups with respect to the following parameters: growth rate, feed-efficiency ratio, protein-efficiency ratio, net protein utilization, digestibility, fat absorption, nitrogen balance, phosphorus and calcium retention, serum enzymes, and blood hematology. In a teratology study the authors gave palm oil which contains carotene to rats in amounts of 1-3 mL daily on days 5 through 15 of pregnancy. Exencephaly was found, eye defects and cleft palate occurred at 3 mL levels. The defects observed resembled those caused by hypervitaminosis A, and could be attributed to the high carotene content of palm oil. In another study neither untreated palm oil (15%) nor 15% heated palm oil (in 20% protein diet) induced any anomalies with respect to fertility and in utero growth in rats. The mutagenicity of palm fruit carotene was examined using the reverse mutation test with bacteria, the chromosomal aberration test with mammalian cells and the micronucleus test in mice. The carotene induced neither reverse mutation in Salmonella typhimurium TA98, TA1537, TA100, TA1535 and in Escherichia coli WP2uvrA, nor structural and numerical (polyploidy) chromosomal aberrations in the Chinese hamster fibroblast cell line (CHL). In addition, no increase in micronucleated polychromatic erythrocytes was elicited in the micronucleus test in CD-1(ICR) male mice. However, other studies reported weak mutagenic activity in several commercially available edible palm and corn oils using liquid incubation bioassays with Salmonella typhimurium TA1537."
# print("Function output: ", extract_disease_entities(text))

@app.route('/get_high_disease', methods=['POST'])
def get_high_disease():
    # Get the text from the POST request
    data = request.get_json()
    # print("Data: ", data)
    text = data.get('combine_toxicity', '')

    # Call the function to extract disease entities from the text
    disease_entities = extract_disease_entities(text)

    unique_disease_entities = list(set(disease_entities))

    # Return the extracted disease entities as a JSON response
    return jsonify({"disease_entities": unique_disease_entities})

@app.route('/')
def home():
  return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)