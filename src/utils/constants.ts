
export const WELFARE_CATEGORIES = [
  'Medical Assistance',
  'Death Levy',
  'Child Birth Support',
  'Emergency Assistance'
] as const;

export const NAV_ITEMS = {
  public: ['home', 'about', 'services'],
  member: ['dashboard'],
  executive: {
    fin_sec: [],
    welfare: ['welfare'],
    treasurer: ['treasurer'],
    gen_sec: ['secretary']
  }
} as const;