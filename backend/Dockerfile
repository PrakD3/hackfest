# ProEngine Labs Backend - Production Dockerfile
FROM condaforge/mambaforge:latest

WORKDIR /app

# Install system dependencies & bio-tools
RUN mamba install -y -c conda-forge \
    python=3.11 \
    vina \
    fpocket \
    openbabel \
    rdkit \
    && mamba clean -afy

# Copy requirements
COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
