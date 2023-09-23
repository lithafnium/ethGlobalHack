import { OnTransactionHandler } from '@metamask/snaps-types';
import { heading, panel, text, divider } from '@metamask/snaps-ui';

const url =
  'https://6yum6wkzha.execute-api.us-east-1.amazonaws.com/test/malicious-contract-classifier';

const opcodes_url = 'https://opcodes.crtsn.com/opcodes?address=';
const classifyContracts = async (eth_address: string) => {
  let opcodes = await fetch(`${opcodes_url}${eth_address}`, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    // body data type must match "Content-Type" header
  });
  // @ts-ignore
  opcodes = await opcodes.json();
  console.log(opcodes);

  const data = {
    contract_opcode: opcodes,
  };

  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json',
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });

  return await response.json();
};

// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
  let target = transaction['to'];
  console.log(target);
  // @ts-ignore
  let classification = await classifyContracts(target);
  console.log(classification);
  console.log(JSON.stringify(classification));
  let body = JSON.parse(classification['body'])[0];
  let label = body['label'];
  let score = body['score'];

  score = Number(score.toFixed(2));

  // Display percentage of gas fees in the transaction insights UI.

  let message =
    label == 'Malicious'
      ? 'Malicious Contract Warning ❌'
      : 'Benign Contract ✅';

  return {
    content: panel([
      heading(`${message}`),
      text(`This smart contract is **${label}** with score _${score}_ `),
      divider(),
      text(
        'This result was obtained by analyzing opcode information with a transformer based model, trained millions of smart contracts. _This result is just a suggestion, proceed at your own risk._',
      ),
    ]),
  };
};
