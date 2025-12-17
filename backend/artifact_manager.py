"""
Artifact Manager - File Storage & Retrieval

Manages generated artifacts (outputs from agents).
Uses simple file-based storage for MVP.
"""

import aiofiles
import json
from pathlib import Path
from datetime import datetime
import uuid
from typing import Optional

from models import ArtifactMetadata
from config import settings


class ArtifactManager:
    """
    Manages artifact storage and retrieval.

    Uses file-based storage with JSON metadata.
    """

    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize artifact manager.

        Args:
            storage_path: Path to store artifacts (defaults to config)
        """
        self.storage_path = Path(storage_path or settings.artifact_storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

    async def save_artifact(
        self,
        content: str,
        agent_role: str,
        file_type: str = "markdown"
    ) -> ArtifactMetadata:
        """
        Save artifact and return metadata.

        Args:
            content: Artifact content
            agent_role: Agent that created this
            file_type: File type (markdown, json, text)

        Returns:
            ArtifactMetadata object
        """
        # Generate unique ID
        artifact_id = f"art_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.utcnow()

        # Determine file extension
        extensions = {
            "markdown": "md",
            "json": "json",
            "text": "txt"
        }
        ext = extensions.get(file_type, "txt")

        filename = f"{artifact_id}_{timestamp.strftime('%Y%m%d_%H%M%S')}.{ext}"
        file_path = self.storage_path / filename

        # Save content
        async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
            await f.write(content)

        # Create metadata
        metadata = ArtifactMetadata(
            artifact_id=artifact_id,
            filename=filename,
            content=content,
            created_at=timestamp,
            file_type=file_type,
            size_bytes=len(content.encode('utf-8')),
            agent_role=agent_role
        )

        # Save metadata as JSON
        metadata_path = self.storage_path / f"{artifact_id}_meta.json"
        async with aiofiles.open(metadata_path, 'w', encoding='utf-8') as f:
            await f.write(metadata.model_dump_json(indent=2))

        return metadata

    async def get_artifact(self, artifact_id: str) -> ArtifactMetadata:
        """
        Retrieve artifact by ID.

        Args:
            artifact_id: Artifact identifier

        Returns:
            ArtifactMetadata object

        Raises:
            FileNotFoundError: If artifact doesn't exist
        """
        metadata_path = self.storage_path / f"{artifact_id}_meta.json"

        if not metadata_path.exists():
            raise FileNotFoundError(f"Artifact {artifact_id} not found")

        async with aiofiles.open(metadata_path, 'r', encoding='utf-8') as f:
            metadata_json = await f.read()

        return ArtifactMetadata.model_validate_json(metadata_json)

    async def list_artifacts(self, limit: int = 50) -> list[ArtifactMetadata]:
        """
        List all artifacts (most recent first).

        Args:
            limit: Maximum number to return

        Returns:
            List of ArtifactMetadata objects
        """
        metadata_files = sorted(
            self.storage_path.glob("*_meta.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )[:limit]

        artifacts = []
        for meta_file in metadata_files:
            async with aiofiles.open(meta_file, 'r', encoding='utf-8') as f:
                metadata_json = await f.read()
                artifacts.append(ArtifactMetadata.model_validate_json(metadata_json))

        return artifacts

    async def delete_artifact(self, artifact_id: str) -> bool:
        """
        Delete artifact and its metadata.

        Args:
            artifact_id: Artifact to delete

        Returns:
            True if deleted, False if not found
        """
        metadata_path = self.storage_path / f"{artifact_id}_meta.json"

        if not metadata_path.exists():
            return False

        # Load metadata to get filename
        async with aiofiles.open(metadata_path, 'r', encoding='utf-8') as f:
            metadata_json = await f.read()
            metadata = ArtifactMetadata.model_validate_json(metadata_json)

        # Delete content file
        content_path = self.storage_path / metadata.filename
        if content_path.exists():
            content_path.unlink()

        # Delete metadata file
        metadata_path.unlink()

        return True


# Global instance
artifact_manager = ArtifactManager()


# Testing
if __name__ == "__main__":
    import asyncio

    async def test_artifact_manager():
        print("=" * 80)
        print("Testing Artifact Manager")
        print("=" * 80)

        manager = ArtifactManager()

        # Save test artifact
        print("\n1. Saving artifact...")
        content = """# Crypto Market Risk Analysis

## Key Findings
- High volatility detected
- Regulatory uncertainty
- Market manipulation concerns

## Recommendations
- Diversify portfolio
- Monitor regulatory changes
"""
        metadata = await manager.save_artifact(
            content=content,
            agent_role="analyst",
            file_type="markdown"
        )

        print(f"   Saved: {metadata.artifact_id}")
        print(f"   Filename: {metadata.filename}")
        print(f"   Size: {metadata.size_bytes} bytes")

        # Retrieve artifact
        print("\n2. Retrieving artifact...")
        retrieved = await manager.get_artifact(metadata.artifact_id)
        print(f"   Retrieved: {retrieved.artifact_id}")
        print(f"   Content preview: {retrieved.content[:50]}...")

        # List artifacts
        print("\n3. Listing artifacts...")
        artifacts = await manager.list_artifacts(limit=5)
        print(f"   Found {len(artifacts)} artifacts")

        print("\n✅ All tests passed!")

    asyncio.run(test_artifact_manager())
