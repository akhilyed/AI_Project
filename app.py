import streamlit as st
import numpy as np
from sentence_transformers import SentenceTransformer, util
from wonderwords import RandomWord

# 1. Web Page Layout Configuration
st.set_page_config(page_title="Word Draw Guessing Game", page_icon="🤖", layout="centered")

# 2. Load the AI Model and Word Generator (Cached so it only runs once)
@st.cache_resource
def load_game_resources():
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    r_word = RandomWord()
    
    # Generate a fixed vocabulary pool for the AI to "guess" from.
    ai_vocab = [
        r_word.word(include_parts_of_speech=["nouns"], word_min_length=4, word_max_length=10)
        for _ in range(500)  # Expanded vocabulary size to accommodate more unique guesses
    ]
    ai_vocab = list(set([w.lower() for w in ai_vocab if w]))
    
    return model, r_word, ai_vocab

model, r_word, ai_vocab = load_game_resources()

# 3. Initialize Game Session States
if "game_started" not in st.session_state:
    st.session_state.game_started = False
if "secret_word" not in st.session_state:
    st.session_state.secret_word = ""
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "game_over" not in st.session_state:
    st.session_state.game_over = False
if "prompt_count" not in st.session_state:
    st.session_state.prompt_count = 0
# NEW STATE FEATURE: Keep track of every incorrect word the chatbot has guessed
if "wrong_guesses" not in st.session_state:
    st.session_state.wrong_guesses = set()

# Ensure the secret word is in the global vocab pool
if st.session_state.secret_word and st.session_state.secret_word not in ai_vocab:
    ai_vocab.append(st.session_state.secret_word)


# ==================================================
# SCREEN 1: THE LANDING PAGE
# ==================================================
if not st.session_state.game_started:
    st.markdown("<br><br><br>", unsafe_allow_html=True)
    st.title("🎯 Chatbot Word Guessing Game")
    st.subheader("Can you guide the chatbot to guess your secret word?")
    st.write("Click below to get a random word assigned to you.")
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    if st.button("🚀 Start Game", use_container_width=True):
        st.session_state.secret_word = r_word.word(
            include_parts_of_speech=["nouns"],
            word_min_length=4,
            word_max_length=9
        ).lower()
        
        st.session_state.game_started = True
        st.session_state.prompt_count = 0
        st.session_state.game_over = False
        st.session_state.wrong_guesses = set() # Reset wrong guess memory for new game
        st.session_state.chat_history = [
            {"role": "assistant", "content": "I am ready to guess! Give me a description of your word, but remember not to type the word itself. I won't repeat my mistakes!"}
        ]
        st.rerun()

# ==================================================
# SCREEN 2: THE CHAT SCREEN
# ==================================================
else:
    st.title("🤖 Chatbot Guessing Arena")
    
    st.info(f"🔑 **YOUR SECRET WORD:** `{st.session_state.secret_word.upper()}`")
    st.metric(label="Prompts Sent", value=st.session_state.prompt_count)
    st.divider()

    # Render Chat History
    for message in st.session_state.chat_history:
        with st.chat_message(message["role"]):
            st.write(message["content"])

    # Win State
    if st.session_state.game_over:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("Play Again 🔄", use_container_width=True):
            st.session_state.game_started = False
            st.rerun()
            
    # Conversation loop
    else:
        if user_hint := st.chat_input("Describe the word..."):
            user_hint_clean = user_hint.strip().lower()
            
            st.session_state.chat_history.append({"role": "user", "content": user_hint})
            
            # RULE 4: Advanced Anti-Cheat Filter
            user_hint_no_spaces = user_hint_clean.replace(" ", "")
            word_chunks = []
            if len(st.session_state.secret_word) > 4:
                for i in range(3, len(st.session_state.secret_word) - 2):
                    word_chunks.append(st.session_state.secret_word[:i])
                    word_chunks.append(st.session_state.secret_word[i:])
            
            cheating_detected = st.session_state.secret_word in user_hint_no_spaces
            
            if not cheating_detected and word_chunks:
                hint_words = user_hint_clean.split()
                for i in range(0, len(word_chunks), 2):
                    front_piece = word_chunks[i]
                    back_piece = word_chunks[i+1]
                    if front_piece in hint_words and back_piece in hint_words:
                        cheating_detected = True
                        break

            if cheating_detected:
                st.session_state.chat_history.append({
                    "role": "assistant", 
                    "content": f"🚫 **FLAGGED!** Nice try, but you cannot use the secret word (`{st.session_state.secret_word}`) or break it into parts like that!"
                })
                st.rerun()
            
            st.session_state.prompt_count += 1
            
            # RULE 2 & 3: Chatbot forms a guess
            with st.spinner("Chatbot is analyzing your description..."):
                
                # --------------------------------------------------------------
                # NEW FEATURE: DYNAMIC VOCABULARY FILTERING (No Repeated Guesses)
                # --------------------------------------------------------------
                # Filter out any word that is inside our wrong_guesses set
                available_vocab = [w for w in ai_vocab if w not in st.session_state.wrong_guesses]
                
                # Fallback check just in case the AI magically ran through all 500 words
                if not available_vocab:
                    available_vocab = [st.session_state.secret_word]
                
                # Encode only the filtered vocabulary list dynamically
                vocab_embeddings = model.encode(available_vocab, convert_to_tensor=True)
                hint_embedding = model.encode(user_hint_clean, convert_to_tensor=True)
                
                # Calculate similarities against the filtered list
                cos_scores = util.cos_sim(hint_embedding, vocab_embeddings)[0]
                best_match_idx = int(np.argmax(cos_scores.cpu().numpy()))
                chatbot_guess = available_vocab[best_match_idx]
                # --------------------------------------------------------------
            
            # Verify guess outcome
            if chatbot_guess == st.session_state.secret_word:
                st.session_state.chat_history.append({
                    "role": "assistant", 
                    "content": f"🎉 **I GOT IT!** Is your word **{chatbot_guess.upper()}**? YES! \n\n🏆 **You Win!** It took me **{st.session_state.prompt_count}** prompts to successfully guess your word!"
                })
                st.session_state.game_over = True
            else:
                # Store the incorrect guess in memory so it gets filtered out on the next loop iteration
                st.session_state.wrong_guesses.add(chatbot_guess)
                
                st.session_state.chat_history.append({
                    "role": "assistant", 
                    "content": f"🤔 Based on your description, my guess is: **{chatbot_guess.upper()}**? Am I right? Give me another hint!"
                })
                
            st.rerun()