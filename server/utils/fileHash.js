const crypto = require('crypto');

function fileHash(bufferOrString) {
	const hash = crypto.createHash('sha256');
	if (Buffer.isBuffer(bufferOrString)) hash.update(bufferOrString);
	else hash.update(String(bufferOrString));
	return hash.digest('hex');
}

module.exports = { fileHash };
