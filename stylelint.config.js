module.exports = {
	extends: [
		'stylelint-config-standard',
		'stylelint-config-prettier', // Last to disable conflicting rules
	],
	rules: {
		'at-rule-no-unknown': [
			true,
			{
				ignoreAtRules: [
					'tailwind',
					'apply',
					'variants',
					'responsive',
					'screen',
				],
			},
		],
		'declaration-block-trailing-semicolon': null,
		'no-descending-specificity': null,
	},
}
