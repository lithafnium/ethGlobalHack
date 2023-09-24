import json
import os 
import boto3
import json

import requests
import datetime
import base64
import time


ENDPOINT_NAME = os.environ["ENDPOINT_NAME"]
runtime = boto3.Session().client("sagemaker-runtime")

def lambda_handler(event, context):
    print("Received event: ", json.dumps(event, indent=2))
    body = event["body"]
    headers = event["headers"]
    inputs = body["contract_opcode"]
    
    payload = {"inputs": inputs, "parameters": {"truncation": True, "max_length": 512}}
    payload = json.dumps(payload)
    response = runtime.invoke_endpoint(
        EndpointName=ENDPOINT_NAME, ContentType="application/json", Body=payload
    )
    
    result = json.loads(response["Body"].read().decode())
    result = json.dumps(result)
    
    print("Result: ", result)

    statusCode = 200
        # pass

    return {
        'statusCode': statusCode,
        'body': result,
    }