"""
OpcodeFormer training script
"""

from opcodes import OPCODES
from transformers import AutoModelForSequenceClassification, TrainingArguments, Trainer, AutoTokenizer, DataCollatorWithPadding
from datasets import concatenate_datasets, load_dataset, load_from_disk, DatasetDict
import evaluate
import numpy as np

id2label = {0: "Benign", 1: "Malicious"}
label2id = {"Benign": 0, "Malicious": 1}
accuracy = evaluate.combine(["accuracy", "recall", "precision", "f1"])

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)
    return accuracy.compute(predictions=predictions, references=labels)

dataset = load_dataset("forta/malicious-smart-contract-dataset", cache_dir='/tmp')
dataset_labels = [int(item) for item in dataset['train']['malicious']]
dataset['train'] = dataset['train'].remove_columns("malicious").add_column("label", dataset_labels)

tokenizer = AutoTokenizer.from_pretrained("spbpe_tokenizer")

def tokenize_function(input):
    pruned_opcodes_list = []
    for contract_opcodes in input["decompiled_opcodes"]:
        if contract_opcodes is None:
            continue
        pruned_opcodes = ' '.join([opcode for opcode in contract_opcodes.split() if opcode in OPCODES])
        pruned_opcodes_list.append(pruned_opcodes)
    return tokenizer(pruned_opcodes_list, max_length=512, truncation=True, padding=True)

to_remove = []
for col in dataset['train'].column_names:
    if col not in ['label', 'input_ids', 'token_type_ids', 'attention_mask']:
        to_remove.append(col)
tokenized_dataset = dataset.map(tokenize_function, batched=True, num_proc=16, remove_columns=to_remove)

data_collator = DataCollatorWithPadding(tokenizer=tokenizer)
tokenized_dataset = tokenized_dataset['train'].train_test_split(0.125, seed=100)
print(tokenized_dataset['train'][:10]['label'])

model = AutoModelForSequenceClassification.from_pretrained(
    "bbmodel_classify", num_labels=2, id2label=id2label, label2id=label2id
)

training_args = TrainingArguments(
    output_dir="bbmodel_classify_full_forta",
    learning_rate=5e-6,
    per_device_train_batch_size=24,
    per_device_eval_batch_size=24,
    num_train_epochs=25,
    weight_decay=0.0085,
    save_strategy="steps",
    load_best_model_at_end=True,
    push_to_hub=False,
    logging_steps=10,
    save_total_limit=1,
    eval_steps=50,
    save_steps=300,
    evaluation_strategy="steps"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset["train"],
    eval_dataset=tokenized_dataset["test"],
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

trainer.train()
trainer.save_model("bbmodel_classify")