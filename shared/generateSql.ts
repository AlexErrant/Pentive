import * as fs from 'fs'

const init = fs.readFileSync('./init.sql').toString()

const sql = init
	.split(';')
	.map((x) => x.trim())
	.filter((x) => x !== '')
	.map((x) => x + ';')

fs.writeFile('./src/sql.json', JSON.stringify(sql, null, 4), (err) => {
	if (err != null) {
		console.error(err)
	}
})
