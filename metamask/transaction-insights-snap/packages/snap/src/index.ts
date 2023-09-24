import { OnTransactionHandler } from '@metamask/snaps-types';
import { heading, panel, text, divider } from '@metamask/snaps-ui';

const url =
  'https://6yum6wkzha.execute-api.us-east-1.amazonaws.com/test/malicious-contract-classifier';

const opcodes_url = 'https://opcodes.crtsn.com/opcodes?address=';
const simulate_url = 'https://opcodes.crtsn.com/simulate?fromAddr=';

const getOpcodes = async (toAddr: string) => {
  let opcodes = await fetch(`${opcodes_url}${toAddr}`, {
    method: 'POST',
  });
  return await opcodes.json();
};

const simulateTransaction = async (
  fromAddr: string,
  toAddr: string,
  value: string,
) => {
  let simulate = await fetch(
    `${simulate_url}${fromAddr}&toAddr=${toAddr}&value=${value}&data=${'0xa9059cbb000000000000000000000000fc43f5f9dd45258b3aff31bdbe6561d97e8b71de00000000000000000000000000000000000000000000000000000000000f4240'}`,
    {
      method: 'POST',
    },
  );

  return await simulate.json();
};

const getClassification = async (data: any) => {
  const classification = await fetch(url, {
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
  let json = await classification.json();
  json['message'] = '';
  return json;
};

const classifyContracts = async (
  fromAddr: string,
  toAddr: string,
  value: string,
) => {
  let classification = getOpcodes(toAddr).then((opcodes) => {
    let data;
    if (opcodes) {
      data = {
        contract_opcode: opcodes,
      };
    } else {
      return {
        message: 'This address is likely **another wallet.**',
        body: '[{"label": "Benign", "score": 1}]',
      };
    }

    return getClassification(data);
  });

  let simulate = simulateTransaction(fromAddr, toAddr, value);

  const results = await Promise.allSettled([simulate, classification]);
  console.log(results[0]);
  console.log(results[1]);
  // console.log(classification);
  // // @ts-ignore

  // simulate = await simulate.json();
  // console.log(simulate);

  // @ts-ignore
  return [results[0]['value'], results[1]['value']];
};

interface Transaction {
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  from: string;
  to: string;
  value: string;
}

// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
  // @ts-ignore
  let t: Transaction = transaction;
  console.log(transaction);
  let from = t['from'];
  let to = t['to'];
  let value = t['value'];
  let [simulation, classification] = await classifyContracts(from, to, value);

  console.log(simulation);
  console.log(classification);

  let body = JSON.parse(classification['body'])[0];
  let label = body['label'];
  let score = body['score'];

  score = Number(score.toFixed(2));

  // Display percentage of gas fees in the transaction insights UI.

  let message =
    label == 'Malicious'
      ? 'Malicious Contract Warning ❌'
      : 'Benign Contract ✅';

  let simulationChildren;
  if (simulation['error']) {
    console.log(simulation['error']);
    simulationChildren = [
      text(
        `**This transaction was unable to be simulated**: ${simulation['error']['message']}`,
      ),
    ];
  } else {
    let simulationChanges = simulation['result']['changes'];

    simulationChildren = simulationChanges.map((c: any) => {
      return panel([
        text(
          `${
            from == c['from'] ? 'Your Address' : c['from'].substring(0, 10)
          }... ⏩ ${c['to'].substring(0, 10)}...`,
        ),
        text(`**Amount**: ${c['amount']} ${c['symbol']} 💶 `),
        divider(),
      ]);
    });

    simulationChildren.push(
      panel([
        text(
          'Above is a simulation of asset changes after making the above transaction. If this does not look malicious, feel free to ignore this warning.',
        ),
      ]),
    );
  }

  let simulateChildren =
    label == 'Malicious'
      ? [divider(), heading('Simulation Results'), panel(simulationChildren)]
      : [];

  return {
    content: panel([
      heading(`${message}`),
      text(`This smart contract is **${label}** with score _${score}_ `),
      text(`${classification['message']}`),
      divider(),
      text(
        'This result was obtained by analyzing opcode information with a transformer based model, trained on millions of smart contracts. _This result is just a suggestion, proceed at your own risk._',
      ),
      panel(simulateChildren),
    ]),
  };
};
