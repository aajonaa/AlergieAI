import streamlit as st
from openai import OpenAI, APIConnectionError

st.set_page_config(page_title="AlergieAI Chat", page_icon="🤖")

# 1. Connect to YOUR local backend
# We point the "OpenAI" client to your vLLM server
client = OpenAI(
    base_url="http://localhost:8000/v1", 
    api_key="dummy-key" # vLLM doesn't check keys by default
)

@st.cache_data(ttl=60)
def get_model_name():
    """Get model name from vLLM server - no hardcoded fallback."""
    try:
        models = client.models.list()
        if models.data:
            return models.data[0].id
        return None
    except APIConnectionError:
        return None
    except Exception as e:
        st.warning(f"Could not get model name: {e}")
        return None

st.title("🤖 AlergieAI Chat (Local)")

# Check connection
model_name = get_model_name()
if not model_name:
    st.error("⚠️ Could not connect to the local vLLM server. Please make sure `./start_vllm.sh` is running.")
    st.stop()

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
        try:
            stream = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": m["role"], "content": m["content"]}
                    for m in st.session_state.messages
                ],
                stream=True,
            )
            response = st.write_stream(stream)
            st.session_state.messages.append({"role": "assistant", "content": response})
        except APIConnectionError:
            st.error("Connection lost to the vLLM server.")
        except Exception as e:
            st.error(f"An error occurred: {e}")