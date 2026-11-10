# Animal Bite Management System — Tasks & Backlog

This directory contains the operational tasks, sprint roadmaps, architecture refactoring plans, team assignments, and clinical specifications for the Animal Bite Management System.

---

## Directory Overview

```text
docs/tasks/
├── guide/                      # Main system documentation & operational guides
├── 01-roadmaps-and-todos/      # Sprint roadmaps, progressive TODOs, and bug tracking
├── 02-team-assignments/        # Formal team assignment specifications by domain
├── 03-controller-refactoring/  # Multi-developer controller refactoring architecture
├── 04-clinical-and-workflows/  # Clinical domain logic, PEP resolution, and workflow plans
├── 05-mobile-app-tasks/        # Mobile-specific implementation plans & architecture
└── 06-deployment-and-audits/   # Deployment runbooks, pre-release checklists, and audits
```

---

## Task Categories

### 1. [01-roadmaps-and-todos](./01-roadmaps-and-todos/)
High-level execution roadmaps and issue tracking:
* [`TODO.md`](./01-roadmaps-and-todos/TODO.md): Immediate priorities and daily tasks.
* [`TODO_PART_2.md`](./01-roadmaps-and-todos/TODO_PART_2.md): ABTC / RHU workflow intake roadmap.
* [`TODO_PART_3.md`](./01-roadmaps-and-todos/TODO_PART_3.md): Security & risk remediation roadmap.
* [`TODO_PART_4.md`](./01-roadmaps-and-todos/TODO_PART_4.md): Clinical workflow, inventory, Google SSO, and DOH protocols.
* [`bugs.md`](./01-roadmaps-and-todos/bugs.md): Active bug investigation and resolution tracker.

### 2. [02-team-assignments](./02-team-assignments/)
Formal project deliverables divided across team roles:
* [`assignment_1_authentication_and_access_security.md`](./02-team-assignments/assignment_1_authentication_and_access_security.md): Authentication, user roles, and access security.
* [`assignment_2_inventory_integrity_and_audit_trail.md`](./02-team-assignments/assignment_2_inventory_integrity_and_audit_trail.md): Vaccine inventory integrity, FIFO, and audit trails.
* [`assignment_3_test_suite_and_deployment_readiness.md`](./02-team-assignments/assignment_3_test_suite_and_deployment_readiness.md): Test suite coverage, API tests, and deployment verification.

### 3. [03-controller-refactoring](./03-controller-refactoring/)
Architectural refactoring plans to streamline backend controllers:
* [`comprehensive_4_person_controller_refactor_plan.md`](./03-controller-refactoring/comprehensive_4_person_controller_refactor_plan.md): Master 4-person controller refactoring architecture.
* [`person_1_comprehensive_controller_refactor_plan.md`](./03-controller-refactoring/person_1_comprehensive_controller_refactor_plan.md): Person 1 (Auth, Users, Security & Identity).
* [`person_4_comprehensive_controller_refactor_plan.md`](./03-controller-refactoring/person_4_comprehensive_controller_refactor_plan.md): Person 4 (Shared infrastructure & core controllers).

### 4. [04-clinical-and-workflows](./04-clinical-and-workflows/)
Clinical specifications and medical protocol implementation:
* [`admin_patient_profiles_management.md`](./04-clinical-and-workflows/admin_patient_profiles_management.md): Pre-registered patient profile management.
* [`case_continuity_and_reexposure_booster_plan.md`](./04-clinical-and-workflows/case_continuity_and_reexposure_booster_plan.md): Re-exposure & booster protocol design.
* [`case-continuity-and-reexposure-protocol-with-mitigations.md`](./04-clinical-and-workflows/case-continuity-and-reexposure-protocol-with-mitigations.md): Protocol edge-case mitigations.
* [`clinic_operating_schedule_and_pep_resolution_engine.md`](./04-clinical-and-workflows/clinic_operating_schedule_and_pep_resolution_engine.md): Backend mathematical PEP date resolution engine.
* [`configurable_clinic_schedule_and_pep_resolution_plan.md`](./04-clinical-and-workflows/configurable_clinic_schedule_and_pep_resolution_plan.md): Implementation plan for clinic schedule configuration.
* [`nursetemplate.md`](./04-clinical-and-workflows/nursetemplate.md): Dual-nurse workstation and role-based queue flow.
* [`optional_staff_signatures_plan.md`](./04-clinical-and-workflows/optional_staff_signatures_plan.md): Electronic signatures for staff and clinical forms.
* [`patient_duplicate_prevention_and_homonym_resolution_plan.md`](./04-clinical-and-workflows/patient_duplicate_prevention_and_homonym_resolution_plan.md): Redundancy prevention & same-name resolution.
* [`patient_pep_journey_tracking_and_multi_channel_missed_recall.md`](./04-clinical-and-workflows/patient_pep_journey_tracking_and_multi_channel_missed_recall.md): Multi-channel recall & PEP tracking.
* [`public_private_clinic_workflow_templates_plan.md`](./04-clinical-and-workflows/public_private_clinic_workflow_templates_plan.md): Public vs. private clinic workflow switching.
* [`stock_card_inventory_history_redesign_plan.md`](./04-clinical-and-workflows/stock_card_inventory_history_redesign_plan.md): Stock card inventory history redesign.

### 5. [05-mobile-app-tasks](./05-mobile-app-tasks/)
Flutter mobile application design, intake alignment, and defensive logic:
* [`guide-cards-ui-audit.md`](./05-mobile-app-tasks/guide-cards-ui-audit.md): Mobile GuideCard component UI audit.
* [`mobile_bite_intake_centralization_implementation_plan.md`](./05-mobile-app-tasks/mobile_bite_intake_centralization_implementation_plan.md): Alignment of mobile intake with web Forms 1, 2, and 3.
* [`mobile_validation_and_defensive_architecture.md`](./05-mobile-app-tasks/mobile_validation_and_defensive_architecture.md): Flutter client validation & defensive error handling.

### 6. [06-deployment-and-audits](./06-deployment-and-audits/)
Deployment runbooks, pre-release checklists, and audits:
* [`demo_free_hosting_deployment_plan.md`](./06-deployment-and-audits/demo_free_hosting_deployment_plan.md): Demo deployment plan on free hosting tiers.
* [`deployment_branch_workflow.md`](./06-deployment-and-audits/deployment_branch_workflow.md): Railway and Vercel branch deployment workflow.
* [`deployment_readiness_remediation_tasks.md`](./06-deployment-and-audits/deployment_readiness_remediation_tasks.md): Pre-launch remediation checklist.
* [`pre_deployment_system_change_audit.md`](./06-deployment-and-audits/pre_deployment_system_change_audit.md): Pre-deployment system change audit log.
* [`railway_vercel_mobile_deployment_checklist.md`](./06-deployment-and-audits/railway_vercel_mobile_deployment_checklist.md): Step-by-step deployment runbook for web, backend, and mobile.
