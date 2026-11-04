from pydantic import BaseModel, ConfigDict, Field


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    website_url: str = Field(min_length=8, max_length=2000)
    target_keyword: str = Field(default="", max_length=500)


class CompetitorIn(BaseModel):
    url: str = Field(min_length=8, max_length=2000)


class ExperimentIn(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    hypothesis: str = ""
    variant: str = ""
    # Click-through rate is a percentage, so 0-100 is the only meaningful
    # domain. Unbounded floats let a typo (25 instead of 2.5) save a "2500%"
    # lift that then appeared in the experiment table as a real measurement.
    baseline_ctr: float = Field(default=0, ge=0, le=100)
    variant_ctr: float = Field(default=0, ge=0, le=100)
    status: str = Field(default="draft", pattern="^(draft|running|complete|abandoned)$")
    result: str = ""
