from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

ActionName = Literal['explain', 'resubmit', 'rerun', 'return', 'reject', 'hold', 'confirm']
Text = Annotated[str, Field(min_length=1, max_length=200, strip_whitespace=True)]


class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class ActionCreate(Model):
    request_id: Text
    action: ActionName
    reason_code: Text
    note: str | None = Field(default=None, max_length=2000)
    new_receipt_num: str | None = Field(default=None, max_length=200)
    expected_revision: int = Field(ge=1)
    expected_workflow_version: int = Field(ge=0)


class ActionAcknowledge(Model):
    result: Literal['accepted', 'failed']
    detail: str | None = Field(default=None, max_length=500)
