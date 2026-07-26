/**
 * Official Catholic Men Organization (CMO) Bye-Laws and Guidelines As Amended (2023)
 * Holy Cross Catholic Church, Badawa, Kano Diocese
 */
export const CMO_CONSTITUTION_2023 = {
  parish: "Holy Cross Catholic Church, Badawa",
  diocese: "Kano Diocese",
  establishedYear: 2002,
  amendmentYear: 2023,
  membership: {
    cmoRegistrationFee: 1000.00,
    laityCouncilAndAmcFee: 850.00,
    qualifyingPeriodMonths: 12, // Must be registered for at least 1 year to qualify for full benefits
  },
  meetings: {
    generalMeetingSchedule: "Second Sunday of every month",
    amendmentQuorumRatio: 0.50, // At least 1/2 of registered members present required for constitutional amendment
  },
  executive: {
    tenureYears: 4,
    reElectionSameOfficeAllowed: false, // Cannot be re-elected to the same office for consecutive terms
  },
  benefits: {
    sicknessHospitalization: 10000.00,
    majorSurgery: 20000.00,
    relocationGiftMax: 10000.00,
    namingCeremonySupport: 10000.00, // Families contribute N2,500 each
    weddingSupport: 20000.00, // Families contribute N500 each
    weddingOutsideCmoGift: 5000.00,
    youthMemberInvitationGift: 5000.00,
    requiredNoticePeriodMonths: 2, // 2-month prior notice required for invitations
    memberDeathNextOfKin: 50000.00, // Member death benefit
    memberDeathLevyPerMember: 1000.00,
    wifeDeathCondolence: 20000.00,
    wifeDeathLevyPerMember: 500.00,
    childDeathCondolence: 5000.00, // Corrected to N5,000 as per Section K(v)(b)
    childDeathLevyPerMember: 200.00,
    parentDeathCondolence: 10000.00,
  },
  penalties: {
    latenessFine: 50.00, // Applies immediately after opening prayer
    absenceExecutiveFine: 300.00,
    absenceMemberFine: 200.00,
    legalDisputeViolation: "Strictly prohibited to take a member to police/court without prior CMO settlement reporting",
  }
};
