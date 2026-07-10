from typing import Optional, List, Dict
from sqlmodel import SQLModel, Field, Column, JSON
from ayurveda_engine.models import EvidenceTier

class Source(SQLModel, table=True):
    id: str = Field(primary_key=True)
    title: str
    kind: str
    author: Optional[str] = None
    translation: Optional[str] = None
    public_domain: bool = False
    note: Optional[str] = None
    url: Optional[str] = None

class Condition(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    also_known_as: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    description: str = ""
    ayurvedic_view: str = ""
    primary_dosha: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    lifestyle: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    diet: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    red_flags: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    citations: List[dict] = Field(default_factory=list, sa_column=Column(JSON))

class Herb(SQLModel, table=True):
    id: str = Field(primary_key=True)
    common_name: str
    sanskrit_name: Optional[str] = None
    botanical_name: Optional[str] = None
    other_names: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    
    rasa: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    guna: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    virya: Optional[str] = None
    vipaka: Optional[str] = None
    dosha_effect: Dict[str, str] = Field(default_factory=dict, sa_column=Column(JSON))
    karma: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    
    parts_used: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    preparation: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    typical_dosage: Optional[str] = None
    safety: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    citations: List[dict] = Field(default_factory=list, sa_column=Column(JSON))

class Formulation(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    sanskrit_name: Optional[str] = None
    type: Optional[str] = None
    ingredients: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    description: str = ""
    typical_dosage: Optional[str] = None
    safety: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    citations: List[dict] = Field(default_factory=list, sa_column=Column(JSON))

class Indication(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    condition_id: str = Field(foreign_key="condition.id")
    herb_id: Optional[str] = Field(default=None, foreign_key="herb.id")
    formulation_id: Optional[str] = Field(default=None, foreign_key="formulation.id")
    rationale: str
    evidence_tier: str
    citations: List[dict] = Field(default_factory=list, sa_column=Column(JSON))
    note: Optional[str] = None
