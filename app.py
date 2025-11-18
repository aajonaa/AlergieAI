import streamlit as st
from openai import OpenAI

# 1. Connect to YOUR local backend
# We point the "OpenAI" client to your vLLM server
client = OpenAI(
    base_url="http://127.0.0.1:8000/v1", 
    api_key="dummy-key" # vLLM doesn't check keys by default
)

st.title("🤖 AlergieAI Chat (Local Qwen)")

# 2. Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# 3. Display chat messages from history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 4. React to user input
if prompt := st.chat_input("What is up?"):
    # Display user message
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    # Call your local AI
    with st.chat_message("assistant"):
        stream = client.chat.completions.create(
            model="Qwen/Qwen2.5-7B-Instruct-AWQ", # Must match your vLLM model name
            messages=[
                {"role": m["role"], "content": m["content"]}
                for m in st.session_state.messages
            ],
            stream=True,
        )
        response = st.write_stream(stream)
    
    st.session_state.messages.append({"role": "assistant", "content": response})