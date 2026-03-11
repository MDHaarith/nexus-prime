import ast
import sys
import os

def process_python_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            source = f.read()
        
        tree = ast.parse(source)
        
        class SkeletonVisitor(ast.NodeVisitor):
            def __init__(self):
                self.indent = 0

            def print_docstring(self, node):
                doc = ast.get_docstring(node)
                if doc:
                    first_line = doc.strip().split('\n')[0]
                    print(" " * (self.indent + 4) + f'"""{first_line}..."""')

            def visit_ClassDef(self, node):
                bases = [ast.unparse(b) for b in node.bases]
                bases_str = f"({', '.join(bases)})" if bases else ""
                print(" " * self.indent + f"class {node.name}{bases_str}:")
                self.print_docstring(node)
                self.indent += 4
                self.generic_visit(node)
                self.indent -= 4

            def visit_FunctionDef(self, node):
                self._visit_func(node)

            def visit_AsyncFunctionDef(self, node):
                self._visit_func(node, is_async=True)
                
            def _visit_func(self, node, is_async=False):
                try:
                    args_str = ast.unparse(node.args)
                except Exception:
                    args_str = "..."
                
                returns = ""
                if node.returns:
                    try:
                        returns = f" -> {ast.unparse(node.returns)}"
                    except Exception:
                        pass
                
                prefix = "async def " if is_async else "def "
                print(" " * self.indent + f"{prefix}{node.name}({args_str}){returns}:")
                self.print_docstring(node)

        print(f"--- AST Skeleton for {filepath} ---")
        SkeletonVisitor().visit(tree)
    except Exception as e:
        print(f"Error parsing {filepath} as Python: {e}")
        fallback(filepath)

def fallback(filepath):
    print(f"--- First 50 lines of {filepath} ---")
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for i in range(50):
                line = f.readline()
                if not line:
                    break
                print(line, end='')
        print("\n... (truncated)")
    except Exception as e:
        print(f"Could not read {filepath}: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python ast_mapper.py <filepath>")
        sys.exit(1)
        
    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        sys.exit(1)
        
    if filepath.endswith('.py'):
        process_python_file(filepath)
    else:
        fallback(filepath)

if __name__ == "__main__":
    main()
