import argparse
import json
import os
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types

# Define Pydantic models for structured output matching our DB schema
class ExtractedCitation(BaseModel):
    source_title: str
    locator: Optional[str]
    note: Optional[str]

class ExtractedIndication(BaseModel):
    condition_id: str
    rationale: str
    evidence_tier: str
    citations: List[ExtractedCitation]

class ExtractedHerb(BaseModel):
    id: str
    common_name: str
    botanical_name: Optional[str]
    sanskrit_name: Optional[str]
    rasa: Optional[str]
    virya: Optional[str]
    vipaka: Optional[str]
    dosha_effect: Optional[str]
    karma: List[str]
    typical_dosage: Optional[str]
    indications: List[ExtractedIndication]

class IngestionResult(BaseModel):
    herbs: List[ExtractedHerb]

def ingest_text(filepath: str):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    client = genai.Client() # Assumes GEMINI_API_KEY environment variable is set

    system_instruction = """
    You are an Ayurvedic expert parser. 
    Read the provided classical text and extract herbs, their properties (rasa, virya, vipaka, dosha effect), and the conditions they treat (indications).
    Map evidence_tier to "classical".
    Make sure condition_ids are short snake_case strings (e.g. 'agnimandya', 'jvara').
    Return the result strictly as a JSON matching the schema.
    """

    print("Sending text to Gemini for extraction...")
    
    response = client.models.generate_content(
        model='gemini-2.5-pro',
        contents=text,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=IngestionResult,
            temperature=0.1,
        ),
    )

    result_json = response.text
    
    out_dir = Path("data/staging")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{Path(filepath).stem}_extracted.json"
    
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(result_json)
        
    print(f"Extraction complete. Staged for review at: {out_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest classical Ayurvedic texts.")
    parser.add_argument("file", help="Path to the text file to ingest")
    args = parser.parse_args()
    
    # Check if API key is set
    if not os.environ.get("GEMINI_API_KEY"):
        print("Warning: GEMINI_API_KEY environment variable not set. The GenAI client might fail.")
        
    ingest_text(args.file)
