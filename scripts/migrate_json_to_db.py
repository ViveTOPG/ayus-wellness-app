import json
from sqlmodel import Session, SQLModel, create_engine
from pathlib import Path
from ayurveda_engine.db_models import Source, Condition, Herb, Formulation, Indication

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "ayurveda.db"
engine = create_engine(f"sqlite:///{DB_PATH}")

def _read(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)

def migrate():
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. Sources
        sources_data = _read(DATA_DIR / "sources.json")
        for s in sources_data:
            session.add(Source(**s))
            
        # 2. Conditions
        conditions_data = _read(DATA_DIR / "conditions.json")
        for c in conditions_data:
            session.add(Condition(**c))
            
        # 3. Herbs and their indications
        herbs_data = _read(DATA_DIR / "herbs.json")
        for h_data in herbs_data:
            indications_data = h_data.pop("indications", [])
            herb = Herb(**h_data)
            session.add(herb)
            for ind in indications_data:
                session.add(Indication(
                    condition_id=ind["condition_id"],
                    herb_id=herb.id,
                    rationale=ind["rationale"],
                    evidence_tier=ind["evidence_tier"],
                    citations=ind.get("citations", []),
                    note=ind.get("note")
                ))
                
        # 4. Formulations and their indications
        formulations_data = _read(DATA_DIR / "formulations.json")
        for f_data in formulations_data:
            indications_data = f_data.pop("indications", [])
            form = Formulation(**f_data)
            session.add(form)
            for ind in indications_data:
                session.add(Indication(
                    condition_id=ind["condition_id"],
                    formulation_id=form.id,
                    rationale=ind["rationale"],
                    evidence_tier=ind["evidence_tier"],
                    citations=ind.get("citations", []),
                    note=ind.get("note")
                ))
                
        session.commit()
        print(f"Migration complete. Database created at {DB_PATH}")

if __name__ == "__main__":
    migrate()
