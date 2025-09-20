#!/usr/bin/env python3
"""
System Info Extractor for Programming Optimization
Run in your active Conda env: python extract_system_info.py > system_report.txt
Requires: psutil (conda install psutil if missing)
"""

import sys
import os
import platform
import subprocess
import json
from datetime import datetime
import psutil  # For hardware stats

def run_command(cmd):
    """Run shell command and return output."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return f"Error: {e.stderr.strip()}"

def get_conda_envs():
    """List all Conda envs."""
    return run_command("conda env list")

def get_conda_info():
    """Get Conda details in active env."""
    active_env = os.environ.get("CONDA_DEFAULT_ENV", "base")
    pkgs = run_command("conda list --json")
    try:
        pkgs_json = json.loads(pkgs) if pkgs else []
        key_pkgs = {p['name']: p['version'] for p in pkgs_json if p['name'] in 
                    ['python', 'ifcopenshell', 'pandas', 'openpyxl', 'supabase', 'streamlit', 'fastapi']}
        return {
            "active_env": active_env,
            "conda_version": run_command("conda --version").split()[-1] if "conda" in run_command("conda --version") else "N/A",
            "python_version": platform.python_version(),
            "key_packages": key_pkgs,
            "total_packages": len(pkgs_json)
        }
    except json.JSONDecodeError:
        return {"error": "Failed to parse conda list JSON"}

def get_hardware():
    """Get CPU, RAM, disk info."""
    cpu = platform.processor()
    cores = psutil.cpu_count(logical=True)
    ram_total = psutil.virtual_memory().total / (1024**3)  # GB
    ram_available = psutil.virtual_memory().available / (1024**3)  # GB
    disk = psutil.disk_usage('C:\\') if platform.system() == 'Windows' else psutil.disk_usage('/')
    disk_free_gb = disk.free / (1024**3)
    return {
        "cpu": f"{cpu} ({cores} cores)",
        "ram_total_gb": round(ram_total, 1),
        "ram_available_gb": round(ram_available, 1),
        "disk_free_gb": round(disk_free_gb, 1),
        "os": f"{platform.system()} {platform.release()} ({platform.architecture()[0]})"
    }

def main():
    report = {
        "timestamp": datetime.now().isoformat(),
        "current_dir": os.getcwd(),
        "username": os.environ.get("USERNAME", os.environ.get("USER", "N/A")),
        "hardware": get_hardware(),
        "conda": get_conda_info(),
        "envs": get_conda_envs(),
        "path": os.environ.get("PATH", "N/A")  # Truncated if too long
    }
    
    # Pretty-print
    print("=== SYSTEM REPORT FOR OPTIMIZATION ===\n")
    print(f"Generated: {report['timestamp']}")
    print(f"User: {report['username']}")
    print(f"Current Dir: {report['current_dir']}\n")
    
    print("=== HARDWARE & OS ===")
    hw = report['hardware']
    print(f"OS: {hw['os']}")
    print(f"CPU: {hw['cpu']}")
    print(f"RAM: {hw['ram_total_gb']} GB total ({hw['ram_available_gb']} GB available)")
    print(f"Disk (C:/): {hw['disk_free_gb']} GB free\n")
    
    print("=== CONDA & ENV DETAILS ===")
    conda = report['conda']
    print(f"Conda Version: {conda['conda_version']}")
    print(f"Active Env: {conda['active_env']}")
    print(f"Python Version: {conda['python_version']}")
    print(f"Total Packages: {conda['total_packages']}")
    print("Key Packages:")
    for pkg, ver in conda['key_packages'].items():
        print(f"  {pkg}: {ver}")
    if 'error' in conda:
        print(f"Error: {conda['error']}\n")
    
    print("=== ALL CONDA ENVS ===")
    print(report['envs'])
    
    print("\n=== PATH (truncated) ===")
    print(report['path'][:500] + "..." if len(report['path']) > 500 else report['path'])
    
    # JSON dump for easy parsing/sharing
    print("\n=== FULL JSON REPORT ===")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()