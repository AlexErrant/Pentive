/* eslint-disable */
// @ts-nocheck
// This file was generated by lezer-generator. You probably shouldn't edit it.
import { LRParser, LocalTokenGroup } from '@lezer/lr'
import { queryHighlighting } from './query.highlight.js'
export const parser = LRParser.deserialize({
	version: 14,
	states:
		"!|QQOQOOO`OPO'#C^OOOO'#Ch'#ChQQOQOOOOOO'#Ck'#CkOhOPO'#CbOvOPO'#ClOOOO'#Ci'#CiO{OPO,58xOOOO-E6f-E6fO`OPO,59WOOOO-E6g-E6gOOOO1G.d1G.dOOOO'#Cc'#CcOOOO1G.r1G.r",
	stateData: '!W~ORPOXQOYQOZQO~OSSOTSO~OSUXS]XT]XW]X~OSYO~OSSOTSOW[O~O',
	goto: '!UaPPbPPPfjPPPPmsPy!QTQORTUPWR^YQRORXRQWPRZWSTPWR]YTVPW',
	nodeNames:
		'⚠ SimpleString Squared SquareOpen Dash Char RangeOpen RangeClose SquareClose Wildcard Wildcard1 Content',
	maxTerm: 16,
	nodeProps: [
		['closedBy', 3, 'SquareClose', 6, 'RangeClose'],
		['openedBy', 7, 'RangeOpen', 8, 'SquareOpen'],
	],
	propSources: [queryHighlighting],
	skippedNodes: [0],
	repeatNodeCount: 2,
	tokenData: 'RORO',
	tokenizers: [
		new LocalTokenGroup(
			"!O~RVO}h}!Om!O#Ph#P#Qr#Q;'Sh;'S;=`w<%lOh~mOT~~rOS~~wOW~~zP;=`<%lh~",
			45,
		),
		new LocalTokenGroup('t~RRz{[!a!ba!}#Of~aOX~~fOY~~kPR~#Q#Rn~sOR~~', 35, 11),
	],
	topRules: { SimpleString: [0, 1] },
	dynamicPrecedences: { '16': 1 },
	tokenPrec: 0,
})
