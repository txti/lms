from functools import lru_cache

from lms.models import ModuleItemConfiguration


class AssignmentService:
    """A service for getting and setting assignments (ModuleItemConfiguration's)."""

    def __init__(self, db):
        self._db = db

    def get_document_url(self, tool_consumer_instance_guid, resource_link_id):
        """
        Return the matching document URL or None.

        Return the document URL for the assignment with the given
        tool_consumer_instance_guid and resource_link_id, or None.
        """
        mic = self._get(tool_consumer_instance_guid, resource_link_id)

        return mic.document_url if mic else None

    def set_document_url(
        self, tool_consumer_instance_guid, resource_link_id, document_url
    ):
        """
        Save the given document_url.

        Set the document_url for the assignment that matches
        tool_consumer_instance_guid and resource_link_id. Any existing document
        URL for this assignment will be overwritten.
        """
        mic = self._get(tool_consumer_instance_guid, resource_link_id)

        if mic:
            mic.document_url = document_url
        else:
            self._db.add(
                ModuleItemConfiguration(
                    document_url=document_url,
                    resource_link_id=resource_link_id,
                    tool_consumer_instance_guid=tool_consumer_instance_guid,
                )
            )

        # Clear the cache (@lru_cache) on self._get because we've changed the
        # contents of the DB. (Python's @lru_cache doesn't have a way to remove
        # just one key from the cache, you have to clear the entire cache.)
        self._get.cache_clear()

    @lru_cache(maxsize=None)
    def _get(self, tool_consumer_instance_guid, resource_link_id):
        return (
            self._db.query(ModuleItemConfiguration)
            .filter_by(
                tool_consumer_instance_guid=tool_consumer_instance_guid,
                resource_link_id=resource_link_id,
            )
            .one_or_none()
        )


def factory(_context, request):
    return AssignmentService(db=request.db)
