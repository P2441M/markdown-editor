export const LATEX_SYMBOLS = [
  {
    category: 'Greek Letters',
    symbols: [
      { cmd: '\\alpha' }, { cmd: '\\beta' }, { cmd: '\\gamma' }, { cmd: '\\delta' },
      { cmd: '\\epsilon' }, { cmd: '\\zeta' }, { cmd: '\\eta' }, { cmd: '\\theta' },
      { cmd: '\\iota' }, { cmd: '\\kappa' }, { cmd: '\\lambda' }, { cmd: '\\mu' },
      { cmd: '\\nu' }, { cmd: '\\xi' }, { cmd: '\\omicron' }, { cmd: '\\pi' },
      { cmd: '\\rho' }, { cmd: '\\sigma' }, { cmd: '\\tau' }, { cmd: '\\upsilon' },
      { cmd: '\\phi' }, { cmd: '\\chi' }, { cmd: '\\psi' }, { cmd: '\\omega' },
      { cmd: '\\varepsilon' }, { cmd: '\\vartheta' }, { cmd: '\\varkappa' },
      { cmd: '\\varpi' }, { cmd: '\\varrho' }, { cmd: '\\varsigma' }, { cmd: '\\varphi' },
      { cmd: '\\Gamma' }, { cmd: '\\Delta' }, { cmd: '\\Theta' }, { cmd: '\\Lambda' },
      { cmd: '\\Xi' }, { cmd: '\\Pi' }, { cmd: '\\Sigma' }, { cmd: '\\Upsilon' },
      { cmd: '\\Phi' }, { cmd: '\\Psi' }, { cmd: '\\Omega' }
    ]
  },
  {
    category: 'Math Operators',
    symbols: [
      { cmd: '\\times' }, { cmd: '\\div' }, { cmd: '\\pm' }, { cmd: '\\mp' },
      { cmd: '\\cdot' }, { cmd: '\\circ' }, { cmd: '\\bullet' }, { cmd: '\\ast' },
      { cmd: '\\star' }, { cmd: '\\cap' }, { cmd: '\\cup' }, { cmd: '\\uplus' },
      { cmd: '\\sqcap' }, { cmd: '\\sqcup' }, { cmd: '\\vee' }, { cmd: '\\wedge' },
      { cmd: '\\oplus' }, { cmd: '\\ominus' }, { cmd: '\\otimes' }, { cmd: '\\oslash' },
      { cmd: '\\odot' }, { cmd: '\\bigcirc' }, { cmd: '\\dagger' }, { cmd: '\\ddagger' },
      { cmd: '\\amalg' }, { cmd: '\\sum' }, { cmd: '\\prod' }, { cmd: '\\coprod' },
      { cmd: '\\int' }, { cmd: '\\iint' }, { cmd: '\\iiint' }, { cmd: '\\oint' },
      { cmd: '\\partial' }, { cmd: '\\nabla' }, { cmd: '\\infty' }, { cmd: '\\propto' }
    ]
  },
  {
    category: 'Relations',
    symbols: [
      { cmd: '\\leq' }, { cmd: '\\geq' }, { cmd: '\\equiv' }, { cmd: '\\sim' },
      { cmd: '\\simeq' }, { cmd: '\\approx' }, { cmd: '\\cong' }, { cmd: '\\neq' },
      { cmd: '\\parallel' }, { cmd: '\\perp' }, { cmd: '\\in' }, { cmd: '\\notin' },
      { cmd: '\\subset' }, { cmd: '\\supset' }, { cmd: '\\subseteq' }, { cmd: '\\supseteq' },
      { cmd: '\\ll' }, { cmd: '\\gg' }, { cmd: '\\prec' }, { cmd: '\\succ' },
      { cmd: '\\preceq' }, { cmd: '\\succeq' }, { cmd: '\\doteq' }, { cmd: '\\bowtie' },
      { cmd: '\\smile' }, { cmd: '\\frown' }, { cmd: '\\asymp' }, { cmd: '\\vdash' },
      { cmd: '\\dashv' }, { cmd: '\\models' }
    ]
  },
  {
    category: 'Arrows',
    symbols: [
      { cmd: '\\leftarrow' }, { cmd: '\\rightarrow' }, { cmd: '\\uparrow' }, { cmd: '\\downarrow' },
      { cmd: '\\leftrightarrow' }, { cmd: '\\updownarrow' }, { cmd: '\\Leftarrow' },
      { cmd: '\\Rightarrow' }, { cmd: '\\Uparrow' }, { cmd: '\\Downarrow' },
      { cmd: '\\Leftrightarrow' }, { cmd: '\\Updownarrow' }, { cmd: '\\nearrow' },
      { cmd: '\\searrow' }, { cmd: '\\swarrow' }, { cmd: '\\nwarrow' }, { cmd: '\\mapsto' },
      { cmd: '\\hookleftarrow' }, { cmd: '\\hookrightarrow' }, { cmd: '\\leftharpoonup' },
      { cmd: '\\rightharpoonup' }, { cmd: '\\leftharpoondown' }, { cmd: '\\rightharpoondown' },
      { cmd: '\\rightleftharpoons' }, { cmd: '\\iff' }, { cmd: '\\implies' }
    ]
  },
  {
    category: 'Logic & Set',
    symbols: [
      { cmd: '\\forall' }, { cmd: '\\exists' }, { cmd: '\\nexists' }, { cmd: '\\emptyset' },
      { cmd: '\\varnothing' }, { cmd: '\\top' }, { cmd: '\\bot' }, { cmd: '\\vdash' },
      { cmd: '\\models' }, { cmd: '\\therefore' }, { cmd: '\\because' }, { cmd: '\\neg' },
      { cmd: '\\land' }, { cmd: '\\lor' }, { cmd: '\\in' }, { cmd: '\\notin' },
      { cmd: '\\ni' }, { cmd: '\\subset' }, { cmd: '\\supset' }
    ]
  },
  {
    category: 'Misc',
    symbols: [
      { cmd: '\\angle' }, { cmd: '\\measuredangle' }, { cmd: '\\sphericalangle' },
      { cmd: '\\triangle' }, { cmd: '\\square' }, { cmd: '\\surd' }, { cmd: '\\ell' },
      { cmd: '\\Re' }, { cmd: '\\Im' }, { cmd: '\\aleph' }, { cmd: '\\beth' },
      { cmd: '\\daleth' }, { cmd: '\\gimel' }, { cmd: '\\hbar' }, { cmd: '\\wp' },
      { cmd: '\\partial' }, { cmd: '\\nabla' }, { cmd: '\\clubsuit' }, { cmd: '\\diamondsuit' },
      { cmd: '\\heartsuit' }, { cmd: '\\spadesuit' }, { cmd: '\\flat' }, { cmd: '\\natural' },
      { cmd: '\\sharp' }, { cmd: '\\mathring{a}' }, { cmd: '\\hat{a}' }, { cmd: '\\tilde{a}' },
      { cmd: '\\bar{a}' }, { cmd: '\\vec{a}' }, { cmd: '\\dot{a}' }, { cmd: '\\ddot{a}' }
    ]
  },
  {
    category: 'Delimiters',
    symbols: [
      { cmd: '(' }, { cmd: ')' }, { cmd: '[' }, { cmd: ']' },
      { cmd: '\\{' }, { cmd: '\\}' }, { cmd: '\\langle' }, { cmd: '\\rangle' },
      { cmd: '|' }, { cmd: '\\|' }, { cmd: '\\lfloor' }, { cmd: '\\rfloor' },
      { cmd: '\\lceil' }, { cmd: '\\rceil' }, { cmd: '\\surd' }
    ]
  },
  {
    category: 'Accents',
    symbols: [
      { cmd: '\\hat{a}' }, { cmd: '\\check{a}' }, { cmd: '\\tilde{a}' }, { cmd: '\\acute{a}' },
      { cmd: '\\grave{a}' }, { cmd: '\\dot{a}' }, { cmd: '\\ddot{a}' }, { cmd: '\\breve{a}' },
      { cmd: '\\bar{a}' }, { cmd: '\\vec{a}' }
    ]
  }
];
