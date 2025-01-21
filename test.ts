// Register a new language
monaco.languages.register({ id: "csvLanguage" });

// Define Monarch Tokenizer
monaco.languages.setMonarchTokensProvider('csvLanguage', {
    tokenizer: {
        root: [
            // Match CSV fields (including quoted fields with escaped quotes and newlines)
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        // If the match includes a newline, reset to root state
                        '@eos': { token: 'part1', next: '@popall' },
                        // First field
                        '$S0==root': { token: 'part1', next: '@part2' },
                        // Default case for other fields
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part2: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part2': { token: 'part2', next: '@part3' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part3: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part3': { token: 'part3', next: '@part4' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part4: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part4': { token: 'part4', next: '@part5' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part5: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part5': { token: 'part5', next: '@part6' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part6: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part6': { token: 'part6', next: '@part7' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part7: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part7': { token: 'part7', next: '@part8' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part8: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part8': { token: 'part8', next: '@part9' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part9: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part9': { token: 'part9', next: '@part10' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part10: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part10': { token: 'part10', next: '@part11' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part11: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part11': { token: 'part11', next: '@part12' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part12: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part12': { token: 'part12', next: '@part13' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part13: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part13': { token: 'part13', next: '@part14' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part14: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part14': { token: 'part14', next: '@part15' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part15: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part15': { token: 'part15', next: '@part16' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part16: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part16': { token: 'part16', next: '@part17' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part17: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part17': { token: 'part17', next: '@part18' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part18: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part18': { token: 'part18', next: '@part19' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part19: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part19': { token: 'part19', next: '@part20' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part20: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part20': { token: 'part20', next: '@part21' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part21: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part21': { token: 'part21', next: '@part22' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part22: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part22': { token: 'part22', next: '@part23' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part23: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part23': { token: 'part23', next: '@part24' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part24: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part24': { token: 'part24', next: '@part25' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part25: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part25': { token: 'part25', next: '@part26' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part26: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part26': { token: 'part26', next: '@part27' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part27: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part27': { token: 'part27', next: '@part28' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part28: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part28': { token: 'part28', next: '@part29' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part29: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part29': { token: 'part29', next: '@part30' },
                        '@default': 'identifier'
                    }
                }
            ]
        ],
        part30: [
            [/(?:"(?:[^"]|"")*"|[^,\n]+)(?:,|\n|$)/, 
                {
                    cases: {
                        '@eos': { token: 'part1', next: '@popall' },
                        '$S0==part30': { token: 'part30' },
                        '@default': 'identifier'
                    }
                }
            ]
        ]
    }
});

// Define the theme
monaco.editor.defineTheme('csvTheme', {
    base: 'vs',
    inherit: false,
    rules: [
        { token: 'part1', foreground: 'ff0000' },
        { token: 'part2', foreground: '00ff00' },
        { token: 'part3', foreground: '0000ff' },
        { token: 'part4', foreground: 'ff00ff' },
        { token: 'part5', foreground: 'ffff00' },
        { token: 'part6', foreground: '00ffff' },
        { token: 'part7', foreground: 'ff8000' },
        { token: 'part8', foreground: '8000ff' },
        { token: 'part9', foreground: '008000' },
        { token: 'part10', foreground: '800000' },
        { token: 'part11', foreground: 'ff0080' },
        { token: 'part12', foreground: '80ff00' },
        { token: 'part13', foreground: '0080ff' },
        { token: 'part14', foreground: 'ff80ff' },
        { token: 'part15', foreground: '80ffff' },
        { token: 'part16', foreground: 'ff8080' },
        { token: 'part17', foreground: '8080ff' },
        { token: 'part18', foreground: '80ff80' },
        { token: 'part19', foreground: 'ff80c0' },
        { token: 'part20', foreground: 'c0ff80' },
        { token: 'part21', foreground: '80c0ff' },
        { token: 'part22', foreground: 'ffc080' },
        { token: 'part23', foreground: 'c080ff' },
        { token: 'part24', foreground: '80ffc0' },
        { token: 'part25', foreground: 'ffc0c0' },
        { token: 'part26', foreground: 'c0c0ff' },
        { token: 'part27', foreground: 'c0ffc0' },
        { token: 'part28', foreground: 'ffc0ff' },
        { token: 'part29', foreground: 'c0ffff' },
        { token: 'part30', foreground: 'ffffc0' },
        { token: 'identifier', foreground: '000000' }
    ],
    colors: {
        'editor.foreground': '#000000',
        'editor.background': '#ffffff'
    }
});

// Create the editor
const editor = monaco.editor.create(document.getElementById('container'), {
    value: 'a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,aa,ab,ac,ad,ae,af\na1,b1,c1,d1,e1,f1,g1,h1,i1,j1,k1,l1,m1,n1,o1,p1,q1,r1,s1,t1,u1,v1,w1,x1,y1,z1,aa1,ab1,ac1,ad1,ae1,af1',
    language: 'csvLanguage',
    theme: 'csvTheme'
});