# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for Audit model."""
from ggrc.models import all_models
from integration.ggrc import generator
from integration.ggrc import TestCase, Api
from integration.ggrc.models import factories


class TestAudit(TestCase):
  """ Test Audit class. """

  def setUp(self):
    super(TestAudit, self).setUp()
    self.api = Api()
    self.gen = generator.ObjectGenerator()

  def generate_control_mappings(self, control):
    """Map Control to several Assessments"""
    acr_creator = all_models.AccessControlRole.query.filter_by(
        name="Creators", object_type="Assessment"
    ).first()
    with factories.single_commit():
      person = factories.PersonFactory()
      asmnt_ids = []
      for _ in range(2):
        asmnt = factories.AssessmentFactory()
        asmnt_ids.append(asmnt.id)
        factories.AccessControlListFactory(
            object=asmnt, person=person, ac_role=acr_creator
        )

    for asmnt_id in asmnt_ids:
      asmnt = all_models.Assessment.query.get(asmnt_id)
      self.gen.generate_relationship(source=asmnt, destination=control)

  def test_creation_mapped_control(self):
    """Check creation of new Audit if Program has Control with mapped roles"""
    control = factories.ControlFactory()
    # Map original of control to several assessments to get propagated roles
    self.generate_control_mappings(control)

    # Existing control should be updated to create new revision with ACL
    self.api.put(control, {"title": "Test Control"})

    program = factories.ProgramFactory()
    factories.RelationshipFactory(source=program, destination=control)
    response = self.api.post(all_models.Audit, [{
        "audit": {
            "title": "New Audit",
            "program": {"id": program.id},
            "status": "Planned",
            "context": None
        }
    }])
    self.assert200(response)

  def test_program_mapping(self):
    """Check creation of new Audit if Program has Control with mapped roles"""

    program = factories.ProgramFactory()
    self.api.post(all_models.Audit, [{
        "audit": {
            "title": "New Audit",
            "program": {"id": program.id, "type": program.type},
            "status": "Planned",
            "context": None
        }
    }])
    audit = all_models.Audit.query.first()
    program = all_models.Program.query.first()
    relationships = all_models.Relationship.find_related(audit, program)
    self.assertIsNotNone(audit)
    self.assertIsNotNone(program)
    self.assertIsNotNone(relationships)

  def test_new_audit_snapshots(self):
    """Test audit snapshot relationships on new audit creation."""

    program = factories.ProgramFactory()
    control = factories.ControlFactory()
    factories.RelationshipFactory(
        source=program,
        destination=control,
    )

    self.api.post(all_models.Audit, [{
        "audit": {
            "title": "New Audit",
            "program": {"id": program.id, "type": program.type},
            "status": "Planned",
            "context": None
        }
    }])
    audit = all_models.Audit.query.first()
    snapshot = all_models.Snapshot.query.first()
    relationships = all_models.Relationship.find_related(audit, snapshot)
    self.assertIsNotNone(audit)
    self.assertIsNotNone(snapshot)
    self.assertIsNotNone(relationships)

  def test_new_snapshot_mapping(self):
    """Test audit snapshot relationships on new snapshot creation."""

    audit = factories.AuditFactory()
    control = factories.ControlFactory()
    self.gen.generate_relationship(audit, control)

    audit = all_models.Audit.query.first()
    snapshot = all_models.Snapshot.query.first()
    relationships = all_models.Relationship.find_related(audit, snapshot)
    self.assertIsNotNone(audit)
    self.assertIsNotNone(snapshot)
    self.assertIsNotNone(relationships)

  def test_new_snapshots_on_update(self):
    """Test relationships for snapshots created by update audit scope."""
    audit = factories.AuditFactory()
    control = factories.ControlFactory()
    self.gen.generate_relationship(audit.program, control)

    self.api.put(audit, data={
        "snapshots": {"operation": "upsert"}
    })

    audit = all_models.Audit.query.first()
    snapshot = all_models.Snapshot.query.first()
    relationships = all_models.Relationship.find_related(audit, snapshot)
    self.assertIsNotNone(audit)
    self.assertIsNotNone(snapshot)
    self.assertIsNotNone(relationships)
