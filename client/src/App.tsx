import { Component, createSignal, For } from "solid-js";
import { createResource } from "solid-js";
import {
  createClient,
  defaultExchanges,
  subscriptionExchange,
} from "@urql/core";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { pipe, subscribe } from "wonka";

const subscriptionClient = new SubscriptionClient("ws://localhost:4000", {
  reconnect: true,
});

const client = createClient({
  url: "http://localhost:4000",
  exchanges: [
    ...defaultExchanges,
    subscriptionExchange({
      forwardSubscription: (operation) =>
        subscriptionClient.request(operation) as any,
    }),
  ],
});

interface Todo {
  id: string;
  done: boolean;
  text: string;
}

const [todos, setTodos] = createSignal<Todo[]>();

const { unsubscribe } = pipe(
  client.subscription(`
    subscription TodosSub {
      todos {
        id
        done
        text
      }
    }
  `),
  subscribe((result) => {
    setTodos(result.data.todos);
  })
);

const App: Component = () => {
  const [text, setText] = createSignal("");

  const onAdd = async () => {
    await client
      .mutation(
        `mutation($text: String!) {
        addTodo(text: $text) {
          id
          text
          done
        }
      }`,
        {
          text: text(),
        }
      )
      .toPromise();
    setText("");
  };

  const toggle = async (id: string) => {
    await client
      .mutation(
        `
      mutation($id: ID!, $done: Boolean!) {
        setDone(id: $id, done: $done){
          id
          text
          done
        }
      }
    `,
        {
          id,
          done: !todos().find((todo) => todo.id === id).done,
        }
      )
      .toPromise();
  };

  return (
    <div>
      <For each={todos()}>
        {({ id, done, text }) => (
          <div>
            <input type="checkbox" checked={done} onclick={(e) => toggle(id)} />{" "}
            <span>{text}</span>
          </div>
        )}
      </For>
      <div>
        <input
          type="text"
          value={text()}
          oninput={(e) => setText(e.currentTarget.value)}
        />
        <button onclick={onAdd}>Add</button>
      </div>
    </div>
  );
};

export default App;
