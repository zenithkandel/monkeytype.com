import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import subprocess
import os

class PayloadGeneratorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("MonkeyType Payload Generator")
        self.root.geometry("700x800")
        
        self.main_frame = ttk.Frame(self.root, padding="10")
        self.main_frame.pack(fill=tk.BOTH, expand=True)

        self.create_widgets()

    def create_widgets(self):
        # Configuration Frame
        config_frame = ttk.LabelFrame(self.main_frame, text="Generate Options", padding="10")
        config_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        
        # WPM
        ttk.Label(config_frame, text="Target WPM:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.wpm_var = tk.StringVar(value="90")
        ttk.Entry(config_frame, textvariable=self.wpm_var).grid(row=0, column=1, sticky=(tk.W, tk.E), pady=2)

        # Duration
        ttk.Label(config_frame, text="Duration (s):").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.duration_var = tk.StringVar(value="30")
        ttk.Entry(config_frame, textvariable=self.duration_var).grid(row=1, column=1, sticky=(tk.W, tk.E), pady=2)

        # Accuracy
        ttk.Label(config_frame, text="Accuracy (%):").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.acc_var = tk.StringVar(value="96")
        ttk.Entry(config_frame, textvariable=self.acc_var).grid(row=2, column=1, sticky=(tk.W, tk.E), pady=2)

        # UID
        ttk.Label(config_frame, text="User ID (UID):").grid(row=3, column=0, sticky=tk.W, pady=2)
        self.uid_var = tk.StringVar(value="")
        ttk.Entry(config_frame, textvariable=self.uid_var).grid(row=3, column=1, sticky=(tk.W, tk.E), pady=2)

        # Mode
        ttk.Label(config_frame, text="Mode:").grid(row=4, column=0, sticky=tk.W, pady=2)
        self.mode_var = tk.StringVar(value="time")
        ttk.Combobox(config_frame, textvariable=self.mode_var, values=["time", "words"], state="readonly").grid(row=4, column=1, sticky=(tk.W, tk.E), pady=2)

        # Language
        ttk.Label(config_frame, text="Language:").grid(row=5, column=0, sticky=tk.W, pady=2)
        self.language_var = tk.StringVar(value="english")
        ttk.Entry(config_frame, textvariable=self.language_var).grid(row=5, column=1, sticky=(tk.W, tk.E), pady=2)

        # Toggles frame
        toggles_frame = ttk.Frame(config_frame)
        toggles_frame.grid(row=6, column=0, columnspan=2, sticky=tk.W, pady=5)
        
        self.punct_var = tk.BooleanVar()
        ttk.Checkbutton(toggles_frame, text="Punctuation", variable=self.punct_var).pack(side=tk.LEFT, padx=5)

        self.numbers_var = tk.BooleanVar()
        ttk.Checkbutton(toggles_frame, text="Numbers", variable=self.numbers_var).pack(side=tk.LEFT, padx=5)
        
        # Save output
        save_frame = ttk.Frame(config_frame)
        save_frame.grid(row=7, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        ttk.Label(save_frame, text="Save to File:").pack(side=tk.LEFT)
        self.output_var = tk.StringVar(value="payload.json")
        ttk.Entry(save_frame, textvariable=self.output_var).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Button(save_frame, text="Browse", command=self.browse_file).pack(side=tk.LEFT)

        # Buttons
        ttk.Button(self.main_frame, text="Generate Payload", command=self.generate).grid(row=1, column=0, pady=10)

        # Output console
        ttk.Label(self.main_frame, text="Console Output:").grid(row=2, column=0, sticky=tk.W)
        
        self.console = tk.Text(self.main_frame, height=20, bg="black", fg="white", font=("Consolas", 10))
        self.console.grid(row=3, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        scrollbar = ttk.Scrollbar(self.main_frame, orient=tk.VERTICAL, command=self.console.yview)
        scrollbar.grid(row=3, column=1, sticky=(tk.N, tk.S))
        self.console.configure(yscrollcommand=scrollbar.set)
        
        self.main_frame.columnconfigure(0, weight=1)
        self.main_frame.rowconfigure(3, weight=1)
        config_frame.columnconfigure(1, weight=1)

    def browse_file(self):
        filename = filedialog.asksaveasfilename(
            initialfile="payload.json",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if filename:
            self.output_var.set(filename)

    def generate(self):
        self.console.delete(1.0, tk.END)
        self.console.insert(tk.END, "Generating payload...\n")
        self.root.update_idletasks()

        cli_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'payload-generator', 'payload-cli.js')
        if not os.path.exists(cli_path):
            # Fallback if run directly from within the folder
            cli_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'payload-cli.js')
            
        if not os.path.exists(cli_path):
            self.console.insert(tk.END, "Error: Cannot find payload-cli.js\n")
            return

        cmd = ['node', cli_path]
        
        if self.wpm_var.get().strip():
            cmd.extend(['--wpm', self.wpm_var.get().strip()])
        if self.duration_var.get().strip():
            cmd.extend(['--duration', self.duration_var.get().strip()])
        if self.acc_var.get().strip():
            cmd.extend(['--acc', self.acc_var.get().strip()])
        if self.uid_var.get().strip():
            cmd.extend(['--uid', self.uid_var.get().strip()])
        if self.mode_var.get().strip():
            cmd.extend(['--mode', self.mode_var.get().strip()])
        if self.language_var.get().strip():
            cmd.extend(['--language', self.language_var.get().strip()])
        
        if self.punct_var.get():
            cmd.append('--punctuation')
        if self.numbers_var.get():
            cmd.append('--numbers')
            
        if self.output_var.get().strip():
            cmd.extend(['--output', self.output_var.get().strip()])

        try:
            # We use cwd=os.path.dirname(cli_path) to ensure correct relative paths inside the generator run
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )

            for line in iter(process.stdout.readline, ''):
                self.console.insert(tk.END, line)
                self.console.see(tk.END)
                self.root.update_idletasks()
                
            process.stdout.close()
            process.wait()
            
            if process.returncode == 0:
                self.console.insert(tk.END, "\n✨ Payload generated successfully!\n")
            else:
                self.console.insert(tk.END, f"\n❌ Process exited with code {process.returncode}\n")

        except Exception as e:
            self.console.insert(tk.END, f"\nError running process: {e}\n")

if __name__ == "__main__":
    root = tk.Tk()
    app = PayloadGeneratorApp(root)
    root.mainloop()
