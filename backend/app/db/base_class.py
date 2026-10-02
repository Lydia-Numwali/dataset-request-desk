from sqlalchemy.orm import DeclarativeBase, declared_attr

class Base(DeclarativeBase):
    id: any
    
    # Generate __tablename__ automatically if not provided
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s"
