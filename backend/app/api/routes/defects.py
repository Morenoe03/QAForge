from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_authenticated_user
from app.core.database import get_db
from app.models.defect import Defect
from app.models.test_run import TestRun, TestRunResult
from app.models.user import User
from app.schemas.defect import DefectCreate, DefectRead, DefectUpdate

router = APIRouter(
    prefix="/api/defects",
    tags=["Defects"],
)


def _get_defect_or_404(db: Session, defect_id: int, user_id: int) -> Defect:
    defect = db.scalar(
        select(Defect).where(
            Defect.id == defect_id,
            Defect.user_id == user_id,
        )
    )
    if defect is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Defect not found.",
        )
    return defect


@router.get("", response_model=list[DefectRead])
def list_defects(
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Sequence[Defect]:
    return db.scalars(
        select(Defect)
        .where(Defect.user_id == user.id)
        .order_by(Defect.created_at.desc(), Defect.id.desc())
    ).all()


@router.get("/{defect_id}", response_model=DefectRead)
def get_defect(
    defect_id: int,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Defect:
    return _get_defect_or_404(db, defect_id, user.id)


@router.post(
    "",
    response_model=DefectRead,
    status_code=status.HTTP_201_CREATED,
)
def create_defect(
    payload: DefectCreate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Defect:
    defect_data = payload.model_dump(exclude={"test_run_result_id"})
    defect = Defect(**defect_data, user_id=user.id)
    if payload.test_run_result_id is not None:
        result = db.scalar(
            select(TestRunResult)
            .join(TestRun, TestRun.id == TestRunResult.run_id)
            .where(
                TestRunResult.id == payload.test_run_result_id,
                TestRun.user_id == user.id,
            )
        )
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test run result not found.",
            )
        if result.outcome != "failed":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Defects can only be linked to failed test results.",
            )
        run = db.scalar(
            select(TestRun).where(
                TestRun.id == result.run_id,
                TestRun.user_id == user.id,
            )
        )
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Test run not found.",
            )
        defect.test_run_result_id = result.id
        defect.case_title = result.case_title
        defect.run_name = run.name

    db.add(defect)
    db.commit()
    db.refresh(defect)
    return defect


@router.patch("/{defect_id}", response_model=DefectRead)
def update_defect(
    defect_id: int,
    payload: DefectUpdate,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Defect:
    defect = _get_defect_or_404(db, defect_id, user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(defect, field, value)
    db.commit()
    db.refresh(defect)
    return defect


@router.delete("/{defect_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_defect(
    defect_id: int,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
) -> Response:
    defect = _get_defect_or_404(db, defect_id, user.id)
    db.delete(defect)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
