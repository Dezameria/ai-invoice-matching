"""Convert a saved core OCR response; no network requests or source file changes."""
import argparse
import json
from pathlib import Path
from app.integrations.table9 import from_table9

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('input', type=Path)
parser.add_argument('output', type=Path)
for name in ('source-system', 'external-id', 'event-id', 'company'):
    parser.add_argument('--' + name, required=True)
args = parser.parse_args()
if args.input.resolve() == args.output.resolve():
    parser.error('Output must be different from the input file.')
if args.output.exists():
    parser.error('Output already exists; choose a new file.')
snapshot = from_table9(json.loads(args.input.read_text(encoding='utf-8-sig')), source_system=args.source_system, external_id=args.external_id, event_id=args.event_id, company=args.company)
args.output.write_text(snapshot.model_dump_json(indent=2), encoding='utf-8')
print('Converted JSON saved. No data was sent to the portal.')
