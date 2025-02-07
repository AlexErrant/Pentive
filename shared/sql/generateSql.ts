import * as fs from 'fs'
import * as chokidar from 'chokidar'

function onChange() {
	const note = fs.readFileSync('./sql/note.sql').toString()
	const card = fs.readFileSync('./sql/card.sql').toString()
	const init = fs.readFileSync('./sql/init.sql').toString()

	const sql = [note, card, init]
		.join('\n')
		.split(';')
		.map((x) => x.trim())
		.filter((x) => x !== '')
		.map((x) => x + ';')

	fs.writeFile('./src/sql.json', JSON.stringify(sql, null, 4), (err) => {
		if (err != null) {
			console.error(err)
		}
	})
}

onChange()

chokidar
	.watch(['./sql/init.sql', './sql/note.sql', './sql/card.sql'])
	.on('change', () => {
		onChange()
	})
