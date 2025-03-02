import {mount} from '@reatom/jsx'

function Sgui() {
	return <div>Seven GUIs!</div>
}

mount( document.querySelector('#root')!, <Sgui /> )
