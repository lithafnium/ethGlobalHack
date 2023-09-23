"""
Defines a REST API for the smart contract thing
"""

from typing import Union, List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from web3 import Web3
from evmdasm import EvmBytecode
import requests

app = FastAPI()

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

provider = "https://ethereum-mainnet-rpc.allthatnode.com/YUQGwJIekqWHpsrUcoghoLChTydDoeEU"
w3 = Web3(Web3.HTTPProvider(provider))

@app.post("/opcodes")
def get_opcodes(address: str):
    """
    Add an email to the waitlist list
    """        
    checksum = Web3.to_checksum_address(address)
    bytecode = w3.eth.get_code(checksum)
    evmcode = EvmBytecode(bytecode)  # can be hexstr, 0xhexstr or bytes
    instructions = evmcode.disassemble()  #  returns an EvmInstructions object (actually a list of new instruction objects)
    instructions_str = " ".join([instr.name for instr in instructions])
    return instructions_str

@app.post("/simulate")
def run_simulation(fromAddr: str, toAddr: str, value: str, data: str):
    alchemy_url = "https://eth-mainnet.g.alchemy.com/v2/GF3WFU-hLysnzwloO0NgTisd5lt7OmTn"

    with_data = [
            {
                "from": fromAddr,
                "to": toAddr,
                "value": value,
                "data": data
            }
        ]
    
    without_data = [
            {
                "from": fromAddr,
                "to": toAddr,
                "value": value,
            }
        ]

    payload = {
        "id": 1,
        "jsonrpc": "2.0",
        "method": "alchemy_simulateAssetChanges",
        "params": with_data if data else without_data
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json"
    }

    response = requests.post(alchemy_url, json=payload, headers=headers)
    print(response.json())
    return response.json()
