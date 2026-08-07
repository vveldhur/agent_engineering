import os
from datetime import datetime
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Categories dictionary for friendly names
CATEGORIES = {
    1: "Cloud Infrastructure & App Dev",
    2: "Data Analytics & AI/ML"
}

# 1-day schedule with 8 talks and 1 lunch break
TALKS_DATA = [
    {
        "id": 1,
        "title": "Scaling Serverless Apps with Google Cloud Run",
        "category_id": 1,
        "category_name": CATEGORIES[1],
        "start_time": "09:00 AM",
        "end_time": "09:45 AM",
        "duration_minutes": 45,
        "description": "Learn the latest patterns for architecting, deploying, and auto-scaling containerized microservices on Cloud Run. We will cover custom domains, CPU allocation strategies, and mounting Cloud Storage buckets for state management.",
        "speakers": [
            {
                "first_name": "Sarah",
                "last_name": "Chen",
                "linkedin": "https://www.linkedin.com/in/sarah-chen-gcp"
            },
            {
                "first_name": "Marcus",
                "last_name": "Vance",
                "linkedin": "https://www.linkedin.com/in/marcus-vance-cloud"
            }
        ]
    },
    {
        "id": 2,
        "title": "Next-Gen Analytics with BigQuery and Gemini",
        "category_id": 2,
        "category_name": CATEGORIES[2],
        "start_time": "09:45 AM",
        "end_time": "10:30 AM",
        "duration_minutes": 45,
        "description": "Discover how to run SQL queries that leverage Gemini models directly within BigQuery. We will explore BigQuery ML, remote functions, and real-time streaming analytics pipelines.",
        "speakers": [
            {
                "first_name": "Amir",
                "last_name": "Patel",
                "linkedin": "https://www.linkedin.com/in/amir-patel-data"
            }
        ]
    },
    {
        "id": 3,
        "title": "Securing Kubernetes Engine (GKE) for Enterprise Workloads",
        "category_id": 1,
        "category_name": CATEGORIES[1],
        "start_time": "10:30 AM",
        "end_time": "11:15 AM",
        "duration_minutes": 45,
        "description": "Deep dive into GKE security best practices, including Workload Identity Federation, network policies, binary authorization, and running private autopilot clusters.",
        "speakers": [
            {
                "first_name": "Elena",
                "last_name": "Rostova",
                "linkedin": "https://www.linkedin.com/in/elena-rostova-sec"
            },
            {
                "first_name": "Devon",
                "last_name": "Lane",
                "linkedin": "https://www.linkedin.com/in/devon-lane-k8s"
            }
        ]
    },
    {
        "id": 4,
        "title": "Building GenAI Agents with Vertex AI Agent Builder",
        "category_id": 2,
        "category_name": CATEGORIES[2],
        "start_time": "11:15 AM",
        "end_time": "12:00 PM",
        "duration_minutes": 45,
        "description": "Learn how to build, test, and deploy production-ready AI agents using natural language. We'll demonstrate grounding agents in enterprise data search and connecting them to external APIs.",
        "speakers": [
            {
                "first_name": "Kenji",
                "last_name": "Sato",
                "linkedin": "https://www.linkedin.com/in/kenji-sato-ai"
            }
        ]
    },
    # Note: Lunch break happens at 12:00 PM - 01:00 PM (handled in the frontend layout)
    {
        "id": 5,
        "title": "Event-Driven Microservices with Eventarc and Workflows",
        "category_id": 1,
        "category_name": CATEGORIES[1],
        "start_time": "01:00 PM",
        "end_time": "01:45 PM",
        "duration_minutes": 45,
        "description": "Learn how to orchestrate complex API integrations and respond to Google Cloud service events asynchronously using Eventarc, Cloud Tasks, and Cloud Workflows.",
        "speakers": [
            {
                "first_name": "Chloe",
                "last_name": "Dupont",
                "linkedin": "https://www.linkedin.com/in/chloe-dupont-dev"
            }
        ]
    },
    {
        "id": 6,
        "title": "AlloyDB: Unleashing Ultra-Fast Postgres on GCP",
        "category_id": 2,
        "category_name": CATEGORIES[2],
        "start_time": "01:45 PM",
        "end_time": "02:30 PM",
        "duration_minutes": 45,
        "description": "Explore the architecture of AlloyDB for PostgreSQL. Learn how its columnar engine, intelligent caching, and built-in AI capabilities accelerate transaction processing and analytical workloads.",
        "speakers": [
            {
                "first_name": "Rajesh",
                "last_name": "Kumar",
                "linkedin": "https://www.linkedin.com/in/rajesh-kumar-db"
            },
            {
                "first_name": "Clara",
                "last_name": "Mendez",
                "linkedin": "https://www.linkedin.com/in/clara-mendez-alloy"
            }
        ]
    },
    {
        "id": 7,
        "title": "Supercharging Mobile Apps with Firebase & Google Cloud",
        "category_id": 1,
        "category_name": CATEGORIES[1],
        "start_time": "02:30 PM",
        "end_time": "03:15 PM",
        "duration_minutes": 45,
        "description": "Bridging the gap between front-end developers and cloud infrastructure. We will showcase how Firebase Auth, Cloud Firestore, and Cloud Functions run seamlessly together on GCP.",
        "speakers": [
            {
                "first_name": "Jordan",
                "last_name": "Smith",
                "linkedin": "https://www.linkedin.com/in/jordan-smith-firebase"
            }
        ]
    },
    {
        "id": 8,
        "title": "Deploying and Tuning LLMs on GCP Infrastructure",
        "category_id": 2,
        "category_name": CATEGORIES[2],
        "start_time": "03:15 PM",
        "end_time": "04:00 PM",
        "duration_minutes": 45,
        "description": "A practical guide to deploying open weights models (like Gemma and Llama) using GKE, vLLM, and TPU/GPU accelerators, covering cost optimization and inference serving performance.",
        "speakers": [
            {
                "first_name": "Dr. Evelyn",
                "last_name": "Forrester",
                "linkedin": "https://www.linkedin.com/in/evelyn-forrester-ml"
            }
        ]
    }
]

CONFERENCE_INFO = {
    "name": "Google Cloud Innovations Summit 2026",
    "location": "Google Cloud Campus, Sunnyvale, CA & Virtual Stream",
    "date": datetime.now().strftime("%A, %B %d, %Y")
}

@app.route("/")
def home():
    # Pass conference info, talks, and categories
    return render_template("index.html", 
                           conference=CONFERENCE_INFO, 
                           talks=TALKS_DATA, 
                           categories=CATEGORIES)

@app.route("/api/talks")
def get_talks():
    return jsonify({
        "conference": CONFERENCE_INFO,
        "talks": TALKS_DATA,
        "categories": CATEGORIES
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
