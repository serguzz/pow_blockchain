from .block import Block
import os, time
import pandas as pd

# Blockchain class - the sequence of blocks
class Blockchain:
    difficulty = 1  # difficulty of the genesis Block
    def __init__(self, node_id=None, difficulty=5):  # Set default difficulty to 4
        self.node_id = node_id or "default"
        self.difficulty = difficulty  # Initialize difficulty
        self.chain = []
        if os.path.exists(self.get_csv_path()):
            self.load_chain(self.get_csv_path())
        else:
            self.chain = [self.create_genesis_block()]
            self.save_chain()

    def get_csv_path(self):
        return f"blockchain/blockchain_{self.node_id}.csv"

    def load_chain(self, path):
        """Load blockchain from CSV, or create genesis block if file is missing."""
        chain = []
        df = pd.read_csv(path)
        print(f"Iterating over {len(df)} blocks in loaded chain.")
        for _, row in df.iterrows():
            block = Block(
                index=int(row['index']),
                previous_hash=row['previous_hash'],
                transactions=row['transactions'],
                miner=row['miner'],
                difficulty=int(row['difficulty']),
                timestamp=float(row['timestamp']),
                nonce=int(row['nonce']),
                hash=row['hash']
            )
            chain.append(block)

        if self.validate_chain(chain):
            self.chain = chain
        else:
            print(f"Chain invalid!!!")
            self.chain = [self.create_genesis_block()]
            self.save_chain()


    def save_chain(self):
        """Save current blockchain to CSV."""
        data = [{
            "index": block.index,
            "previous_hash": block.previous_hash,
            "timestamp": block.timestamp,
            "transactions": block.transactions,
            "miner": block.miner,
            "difficulty": block.difficulty,
            "nonce": block.nonce,
            "hash": block.hash
        } for block in self.chain]

        df = pd.DataFrame(data)
        df.to_csv(self.get_csv_path(), index=False)


    def create_genesis_block(self):
        """Creates the first block with a fixed previous hash."""
        block = Block(0, "empty_hash", "Genesis Block", miner=self.node_id, difficulty=self.difficulty)
        block.mine_block()  # Mine the genesis block
        return block


    def get_latest_block(self):
        return self.chain[-1]


    def mine_block(self, transactions, stop_event=None):
        """Adds a new block with PoW to the blockchain."""
        latest_block = self.get_latest_block()
        if latest_block.hash != latest_block.calculate_hash():
            print(f"Block cannot be added: latest block hash {latest_block.hash} does not match calculated hash {latest_block.calculate_hash()}")
            return None
        index = latest_block.index + 1  # or len(self.chain)
        dificulty = max(latest_block.difficulty, self.difficulty)
        
        new_block = Block(index, latest_block.hash, transactions, self.node_id, dificulty)
        new_hash = new_block.mine_block(stop_event=stop_event)
        if new_hash is None:
            print("⛔ Mining was interrupted on blockchain level.")
            return None

        self.chain.append(new_block)
        self.save_chain()  # <-- Save on every new block
        return new_block


    def validate_block(self, block, previous_block):
        """Validates the block against the previous block."""
        if block.index != previous_block.index + 1:
            print(f"Block index {block.index} is not in order with previous block index {previous_block.index}")
            return False
        if block.previous_hash != previous_block.hash:
            print(f"Block previous hash {block.previous_hash} does not match previous block hash {previous_block.hash}")
            return False
        if block.hash != block.calculate_hash():
            print(f"Block hash {block.hash} does not match calculated hash {block.calculate_hash()}")
            return False
        if block.difficulty < previous_block.difficulty:
            print(f"Block difficulty {block.difficulty} is less than previous block difficulty {previous_block.difficulty}")
            return False
        if block.timestamp <= previous_block.timestamp:
            print("Block time is not in order")
            return False
        if block.timestamp > time.time() + 2 * 60:   # Allowable clock drift
           print("Block time is too far in the future")
           return False
        return True


    # Validates entire chain
    def validate_chain(self, chain):
        if not chain:
            print("Chain is empty")
            return False
        
        if chain[0].hash != chain[0].calculate_hash():
            print(f"Genesis block {chain[0]} hash is invalid")
            return False
        
        for i in range(1, len(chain)):
            # print(f"Validating block {i} against block {i-1}")
            if not self.validate_block(chain[i], chain[i - 1]):
                print(f"Block {i} is invalid")
                return False
        return True

