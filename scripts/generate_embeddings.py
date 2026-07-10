import json
from pathlib import Path
import chromadb
from chromadb.config import Settings
import sys
import os

# Add parent directory to path so we can import ayurveda_engine
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ayurveda_engine.knowledge_base import KnowledgeBase

def generate_embeddings():
    print("Loading KnowledgeBase...")
    kb = KnowledgeBase.load()
    
    # Initialize ChromaDB client
    data_dir = Path(__file__).resolve().parent.parent / "data"
    chroma_path = str(data_dir / "chroma_db")
    print(f"Initializing ChromaDB at {chroma_path}...")
    
    # Persistent client
    client = chromadb.PersistentClient(path=chroma_path)
    
    # Delete existing collections to recreate them fresh
    try:
        client.delete_collection("conditions")
    except Exception:
        pass
        
    try:
        client.delete_collection("herbs")
    except Exception:
        pass

    # Recreate collections
    print("Creating collections...")
    conditions_col = client.create_collection("conditions")
    herbs_col = client.create_collection("herbs")
    
    print("Generating condition embeddings...")
    cond_ids = []
    cond_docs = []
    cond_metas = []
    for cid, c in kb.conditions.items():
        cond_ids.append(cid)
        # Construct a rich text document for embedding
        text = f"{c.name}. {c.description}"
        if c.also_known_as:
            text += f" Also known as: {', '.join(c.also_known_as)}."
        cond_docs.append(text)
        cond_metas.append({"id": cid, "name": c.name})
    
    if cond_docs:
        conditions_col.add(documents=cond_docs, metadatas=cond_metas, ids=cond_ids)
        
    print("Generating herb embeddings...")
    herb_ids = []
    herb_docs = []
    herb_metas = []
    for hid, h in kb.herbs.items():
        herb_ids.append(hid)
        text_parts = [h.common_name]
        if h.botanical_name:
            text_parts.append(f"Botanical name: {h.botanical_name}")
        if h.sanskrit_name:
            text_parts.append(f"Sanskrit name: {h.sanskrit_name}")
        if h.other_names:
            text_parts.append(f"Other names: {', '.join(h.other_names)}")
        if h.karma:
            text_parts.append(f"Actions (karma): {', '.join(h.karma)}")
        if h.dosha_effect:
            text_parts.append(f"Dosha effect: {h.dosha_effect}")
            
        herb_docs.append(". ".join(text_parts))
        herb_metas.append({"id": hid, "name": h.common_name, "botanical_name": h.botanical_name or ""})
        
    if herb_docs:
        herbs_col.add(documents=herb_docs, metadatas=herb_metas, ids=herb_ids)
        
    print(f"Successfully generated embeddings for {len(cond_docs)} conditions and {len(herb_docs)} herbs.")

if __name__ == "__main__":
    generate_embeddings()
