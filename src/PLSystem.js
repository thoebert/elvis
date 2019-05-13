import plSystemException from './plSystemException';
import * as math from 'mathjs'

/**
 * Processes symbols of pl-systems. Beginning with a given
 * axiom it applies the production rules and calls the functions
 * for the resulting symbols.
 * @class
 * @constructor
 * @public
 */
export default class PLSystem {

    funcs;

    /**
     * Creates a new PLSystem with a list of productions and their functions.
     * @param func a list of symbols (attribute sym),
     *  parameter length (attribute paramlength)
     *  and the actual function (attribute func)
     */
    constructor(funcs) {
        this.funcs = funcs;
    }

    /**
     * Applies the productions iteratively, beginning with the axiom and calls the production functions.
     * @param axiom the axiom
     * @param list of production rules
     * @param iterations the number of iterations
     */
    produce(axiom, productions, iterations) {
        productions = PLSystem.filterEmpty(productions.split('\n'));
        //console.log(axiom, productions, iterations);
        if (isNaN(iterations) || iterations < 0) {
            throw new plSystemException("Please enter a valid iteration number");
        }

        // parse all production rules
        let prods = [];
        const expression = /(?<head>.*?)(:(?<condition>.*))?->(?<body>.*)/;
        for (let i = 0; i < productions.length; i++) {
            const p = productions[i].replace(/ /g, "");
            const matchObj = expression.exec(p);
            if (matchObj === null) {
                throw new plSystemException("Invalid Production " + i + ": Please enter a valid production of the syntax VARIABLE[(PARAM)][:CONDITION]->VARIABLES");
            }
            let head = matchObj.groups.head;
            let condition = matchObj.groups.condition;
            var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            if (!isSafari) {
                if (condition) condition = condition.replace(RegExp("/(?<![=<>!])=(?!=)/"), "==");
            }
            let body = matchObj.groups.body;
            head = PLSystem.splitParam(head);
            if (!head.sym || head.sym.length === 0) {
                throw new plSystemException("Invalid Production " + i + ": Please enter a valid production of the syntax VARIABLE[(PARAM)][:CONDITION]->VARIABLES");
            }
            prods.push({head: head, condition: condition, body: body});
        }

        //console.log(prods);

        // Applies the productions iteratively
        for (let iter = 0; iter < iterations; iter++) {

            // Find all production symbols and apply the production body
            let newParts = [];
            for (let prodindex = 0; prodindex < prods.length; prodindex++) {
                let prod = prods[prodindex];
                for (let match of PLSystem.findProduction(prod.head.sym, prod.head.params.length, axiom)) {
                    let scope = PLSystem.zipObject(prod.head.params, match.paramvalues);
                    if (PLSystem.checkProductionCondition(prod.condition, scope)) {
                        let newPart = PLSystem.evalProduction(prod.body, scope);
                        newParts.push({start: match.begin, end: match.end, text: newPart, prodindex: prodindex});
                    }
                }
            }

            // sort the resulting production results according to the original string position
            newParts.sort((a, b) => {
                if (a.start === b.start) return a.prodindex - b.prodindex;
                return a.start - b.start;
            });

            //console.log(newParts);

            // generate the resulting axiom
            let newaxiom = '';
            let newPartiter = 0;
            for (let i = 0; i < axiom.length; i++) {
                let newPart = newParts[newPartiter];
                if (newPart !== undefined && i === newPart.start) {
                    newaxiom += newPart.text;
                    i = newPart.end - 1;
                    newPartiter++;
                    while (newParts[newPartiter] !== undefined && newParts[newPartiter].start === newPart.start) {
                        newPartiter++;
                    }
                } else {
                    newaxiom += axiom.charAt(i);
                }
            }
            axiom = newaxiom;
            //console.log("Iteration " + (iter + 1) + ': ' + axiom);
        }
        // Parse the final axiom according to the available turtle commands
        let fs = [];
        for (let f of this.funcs) {
            for (let match of PLSystem.findProduction(f.sym, f.paramlength, axiom)) {
                fs.push({start: match.begin, func: f.func, paramvalues: match.paramvalues});
            }
        }
        // Sort the parsed turtle commands according to the original turtle position
        fs.sort((a, b) => {
            if (a.start === b.start) return a.paramlength - b.paramlength;
            return a.start - b.start;
        });
        // Call all turtle functions
        for (let i = 0; i < fs.length; i++) {
            let f = fs[i];
            f.paramvalues = PLSystem.evalParamValues(f.paramvalues);
            let param = f.paramvalues;
            f.func(param);
            while (fs[i + 1] !== undefined && f.start === fs[i + 1].start) {
                i++;
            }
        }
    }

    /**
     * Parses symbols: 'A(x,y)' -> {sym:'A',params:['x','y']}
     * @param exp the expression to parse
     * @returns {{sym: string, params: Array}}
     */
    static splitParam(exp) {
        const expression = /(?<symbol>[^(]*)(\((?<param>.*)\))?/;
        const matchObj = expression.exec(exp);
        let sym = matchObj.groups.symbol;
        if (sym === undefined) {
            throw new plSystemException("Invalid expression: '" + exp + "'");
        }
        let params = [];
        if (matchObj.groups.param !== undefined) {
            params = PLSystem.filterEmpty(matchObj.groups.param.split(','));
        }
        return {sym: sym, params: params};
    }

    /**
     * Finds the production symbol with the given number of parameters in the axiom
     * @param sym the symbol to find
     * @param paramlength the number of parameters to find after the symbol
     * @param axiom the axiom as search base
     * @returns {Array} a list of searchresults
     */
    static findProduction(sym, paramlength, axiom) {
        let start = 0;
        let matches = [];
        while (true) {
            let paramvalues = [];
            let index = axiom.indexOf(sym, start);
            start = index + 1;
            let endIndex = index + sym.length;
            if (index === -1) break;
            if (paramlength > 0) {
                if (axiom.charAt(endIndex) !== '(') continue;
                let indexBracket = axiom.indexOf(')', endIndex + 1);
                if (indexBracket === -1) continue;
                paramvalues = axiom.substring(endIndex + 1, indexBracket).split(',');
                endIndex = indexBracket + 1;
                paramvalues = PLSystem.filterEmpty(paramvalues);
                if (paramvalues.length !== paramlength) continue;
            }
            matches.push({begin: index, end: endIndex, paramvalues: paramvalues});
        }
        return matches;
    }

    /**
     * Evaluates the mathematical expression parameters of a production axiom
     * @param string the axiom to evaluate
     * @param scope the values of the variable for evaluation
     * @returns {string} the same string with evaluated mathematical expressions
     */
    static evalProduction(string, scope) {
        let output = '';
        let formula = '';
        let isFormula = false;
        for (let index = 0; index < string.length; index++) {
            let char = string.charAt(index);
            switch (char) {
                case '(':
                    output += '(';
                    isFormula = true;
                    break;
                case ')':
                    output += PLSystem.evalFormula(formula, scope);
                    output += ')';
                    formula = '';
                    isFormula = false;
                    break;
                case ',':
                    output += PLSystem.evalFormula(formula, scope);
                    output += ',';
                    formula = '';
                    break;
                default:
                    if (isFormula) {
                        formula += char;
                    } else {
                        output += char;
                    }
                    break;
            }
        }
        return output;
    }

    /**
     * Checks a mathematical condition if it is true
     * @param condition the mathematical expression to check
     * @param scope the values of the variable for evaluation
     * @returns {boolean} true if the expression is true, otherwise false
     */
    static checkProductionCondition(condition, scope) {
        if (condition === undefined) return true;
        try {
            return (math.eval(condition, PLSystem.extendScope(scope)) === true);
        } catch (e) {
            throw new plSystemException("Condition error: " + condition + ' ' + e.toString());
        }
    }

    /**
     * Evaluates a single mathematical expression
     * @param formula the mathematical expression to evaluate
     * @param scope the values of the variable for evaluation
     * @returns {string} the result of the expression
     */
    static evalFormula(formula, scope) {
        try {
            return math.eval(formula, PLSystem.extendScope(scope));
        } catch (e) {
            throw new plSystemException("Formula error: " + formula + ' ' + e.toString());
        }
    }

    /**
     * Zips key and values together to a new object
     * @param keys the key for the new object
     * @param values the values for the new object
     */
    static zipObject(keys, values) {
        let result = {};
        keys.forEach((key, idx) => result[key] = values[idx]);
        return result;
    }

    /**
     * Filters Empty strings from an array of string
     * @param list the list to filter
     * @returns [{string}] the resulting list
     */
    static filterEmpty(list) {
        return list.filter((el) => (el !== null && el.length > 0));
    }

    /**
     * Extends the Scope with a rand attribute with a random number
     * @param scope the scope to extend
     * @returns {...scope, {rand: number}} the resulting scope
     */
    static extendScope(scope) {
        return {...scope, rand: Math.random()};
    }

    /**
     * Evaluates a list of mathematical expressions
     * @param params the list of expressions
     * @returns [{string}] the same list with evaluated expressions
     */
    static evalParamValues(params) {
        for (let i = 0; i < params.length; i++) {
            let formula = params[i];
            params[i] = PLSystem.evalFormula(formula, PLSystem.extendScope({}))
        }
        return params;
    }
}