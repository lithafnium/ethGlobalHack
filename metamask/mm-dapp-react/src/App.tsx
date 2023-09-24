import "./App.css";
import { useState, useEffect } from "react";
import { formatBalance, formatChainAsNum } from "./utils";
import detectEthereumProvider from "@metamask/detect-provider";
import hexer from "browser-string-hexer";

const App = () => {
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);
  const initialState = { accounts: [], balance: "", chainId: "" };
  const [wallet, setWallet] = useState(initialState);
  const [targetAddress, setTargetAddress] = useState("");

  const [isConnecting, setIsConnecting] = useState(false); /* New */
  const [error, setError] = useState(false); /* New */
  const [errorMessage, setErrorMessage] = useState(""); /* New */

  useEffect(() => {
    const refreshAccounts = (accounts: any) => {
      if (accounts.length > 0) {
        updateWallet(accounts);
      } else {
        // if length 0, user is disconnected
        setWallet(initialState);
      }
    };

    const refreshChain = (chainId: any) => {
      setWallet((wallet) => ({ ...wallet, chainId }));
    };

    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true });
      setHasProvider(Boolean(provider));

      if (provider) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        refreshAccounts(accounts);
        window.ethereum.on("accountsChanged", refreshAccounts);
        window.ethereum.on("chainChanged", refreshChain);
      }
    };

    getProvider();

    return () => {
      window.ethereum?.removeListener("accountsChanged", refreshAccounts);
      window.ethereum?.removeListener("chainChanged", refreshChain);
    };
  }, []);

  const updateWallet = async (accounts: any) => {
    const balance = formatBalance(
      await window.ethereum!.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      })
    );
    const chainId = await window.ethereum!.request({
      method: "eth_chainId",
    });
    setWallet({ accounts, balance, chainId });
  };

  const handleConnect = async () => {
    /* Updated */
    setIsConnecting(true); /* New */
    await window.ethereum
      .request({
        /* Updated */ method: "eth_requestAccounts",
      })
      .then((accounts: []) => {
        /* New */
        setError(false); /* New */
        updateWallet(accounts); /* New */
      }) /* New */
      .catch((err: any) => {
        /* New */
        setError(true); /* New */
        setErrorMessage(err.message); /* New */
      }); /* New */
    setIsConnecting(false); /* New */
  };

  const sendTest = async () => {
    // const accounts = await window.ethereum.request({
    //   method: "eth_requestAccounts",
    // });
    await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0xAE330Af95EC7417c328A8bBE135BE9A6F6D12fAC",
          to: targetAddress,
          gas: "0xff", // 30400
          value: "0xff", // 2441406250
          data: "",
        },
      ],
    });
  };

  const sendSign = async () => {
    await window.ethereum.request({
      method: "personal_sign",
      params: [
        hexer("testtesttest"),
        "0xAE330Af95EC7417c328A8bBE135BE9A6F6D12fAC",
      ],
    });
  };

  const disableConnect = Boolean(wallet) && isConnecting;

  return (
    <div className="App">
      {window.ethereum?.isMetaMask && wallet.accounts.length < 1 && (
        /* Updated */
        <button disabled={disableConnect} onClick={handleConnect}>
          Connect MetaMask
        </button>
      )}

      {wallet.accounts.length > 0 && (
        <div className="content">
          <p style={{ fontWeight: "bold" }}>
            Wallet Account: {wallet.accounts[0]}
          </p>
          <p style={{ fontWeight: "bold" }}>Target Address: </p>
          <input
            placeholder="Target Address"
            content={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
          />
          <p>Numeric ChainId: {formatChainAsNum(wallet.chainId)}</p>
          <div style={{ display: "flex" }}>
            <button style={{ display: "block" }} onClick={() => sendTest()}>
              Send ethereum
            </button>
            <button onClick={() => sendSign()}>Sign message</button>
          </div>
        </div>
      )}
      {error /* New code block */ && (
        <div onClick={() => setError(false)}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}
    </div>
  );
};

export default App;
