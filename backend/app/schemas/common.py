from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    data: T
    message: str | None = None


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: dict[str, str] | None = None


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 25
    search: str | None = None
    sort_by: str | None = None
    sort_order: str = "asc"


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
