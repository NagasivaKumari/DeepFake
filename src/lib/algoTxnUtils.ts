import algosdk, { SuggestedParams, Transaction } from 'algosdk';

// Fetch suggested params from backend (which proxies Algod and normalizes genesisHash)
export async function fetchSuggestedParams(): Promise<SuggestedParams> {
	const res = await fetch('/media/algod_params');
	if (!res.ok) throw new Error(`Failed to fetch suggested params (${res.status})`);
	const data = await res.json();
	// data.genesisHash is base64; decode to bytes for algosdk
	const ghB64: string = data.genesisHash || data.genesisHashB64 || data.genesisHashInfo || '';
	const ghBytes = base64ToBytes(ghB64);
	const sp: SuggestedParams = {
		fee: data.fee,
		firstRound: data.firstRound,
		lastRound: data.lastRound,
		genesisID: data.genesisID,
		genesisHash: ghBytes,
		flatFee: !!data.flatFee,
		minFee: data.fee,
	} as SuggestedParams;
	return sp;
}

export function base64ToBytes(b64: string): Uint8Array {
	if (!b64) return new Uint8Array();
	const norm = normalizeBase64(b64);
	try {
		return new Uint8Array(Buffer.from(norm, 'base64'));
	} catch {
		// Browser fallback
		const binStr = atob(norm);
		const out = new Uint8Array(binStr.length);
		for (let i = 0; i < binStr.length; i++) out[i] = binStr.charCodeAt(i);
		return out;
	}
}

export function normalizeBase64(s: string): string {
	let sb = (s || '').trim();
	if (sb.startsWith('data:') && sb.includes(',')) sb = sb.split(',', 2)[1];
	sb = sb.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
	const mod = sb.length % 4;
	if (mod !== 0) sb += '='.repeat((4 - mod) % 4);
	return sb;
}

export function bytesToBase64(bytes: Uint8Array): string {
	try {
		return Buffer.from(bytes).toString('base64');
	} catch {
		let bin = '';
		for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
		return btoa(bin);
	}
}

// Build payment transaction using fresh suggested params
export async function makePaymentTxn(from: string, to: string, amount: number, note?: string | Uint8Array): Promise<Transaction> {
	if (!algosdk.isValidAddress(from)) throw new Error('Invalid sender address');
	if (!algosdk.isValidAddress(to)) throw new Error('Invalid receiver address');
	const sp = await fetchSuggestedParams();
	let noteBytes: Uint8Array | undefined;
	if (typeof note === 'string') noteBytes = new TextEncoder().encode(note);
	else if (note instanceof Uint8Array) noteBytes = note;
	const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
		sender: from,
		receiver: to,
		amount,
		note: noteBytes,
		suggestedParams: sp,
	});
	return txn;
}

// Send signed transaction bytes or base64 to backend broadcast endpoint
export async function sendSignedTransaction(signed: Uint8Array | string): Promise<{ txid: string; explorer_url?: string }> {
	let b64: string;
	if (typeof signed === 'string') b64 = normalizeBase64(signed);
	else b64 = bytesToBase64(signed);
	const res = await fetch('/media/broadcast_signed_tx', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ signed_tx_b64: b64 }),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Broadcast failed ${res.status}: ${text}`);
	}
	return res.json();
}

export const algoTxnUtils = { fetchSuggestedParams, makePaymentTxn, sendSignedTransaction };
